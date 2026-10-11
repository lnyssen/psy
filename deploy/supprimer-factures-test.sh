#!/usr/bin/env bash
# Supprime de la base du serveur les trois factures de test annulées (2026-001 à 003).
# À lancer depuis le dossier du projet :
#   bash deploy/supprimer-factures-test.sh root@ADRESSE_IP              # aperçu, ne supprime rien
#   bash deploy/supprimer-factures-test.sh root@ADRESSE_IP --executer   # sauvegarde, puis supprime
#
# L'aperçu exécute toute la suppression dans une transaction annulée : il
# montre exactement ce qui partira et ce qui restera. Avec --executer, une
# sauvegarde chiffrée complète est faite d'abord ; en cas d'erreur, rien n'est
# supprimé.
set -euo pipefail

HOTE="${1:?Usage : bash deploy/supprimer-factures-test.sh root@ADRESSE_IP [--executer]}"
EXECUTER=0
[ "${2:-}" = "--executer" ] && EXECUTER=1
cd "$(dirname "$0")"
[ -f supprimer-factures-test.sql ] || { echo "deploy/supprimer-factures-test.sql manquant."; exit 1; }

if [ "$EXECUTER" = 1 ]; then
  read -r -p "Supprimer définitivement les factures de test (une sauvegarde est faite avant) ? Tape OUI : " R
  [ "$R" = "OUI" ] || { echo "Annulé."; exit 1; }
fi

ssh "$HOTE" "set -euo pipefail
  EXECUTER=$EXECUTER
  LOCALE=\"\$(grep -E '^DATABASE_URL=' /srv/psy/config/env.base | cut -d= -f2- | tr -d '\"')\"
  if [ \"\$EXECUTER\" = 1 ]; then
    F=\"/var/backups/psy/avant-suppression-factures-test-\$(date +%Y-%m-%d-%H%M%S).dump.gpg\"
    sudo -u postgres pg_dump -Fc psy \
      | gpg --batch --yes --symmetric --cipher-algo AES256 \
            --passphrase-file /root/.psy-sauvegarde-cle -o \"\$F\"
    chmod 600 \"\$F\"
    [ -s \"\$F\" ] || { echo 'Sauvegarde vide : arrêt, rien supprimé.'; exit 1; }
    echo \"Sauvegarde : \$F (\$(du -h \"\$F\" | cut -f1))\"
  fi
  psql \"\$LOCALE\" -X -q -v executer=\$EXECUTER" < supprimer-factures-test.sql
