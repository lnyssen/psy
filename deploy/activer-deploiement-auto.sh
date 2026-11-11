#!/usr/bin/env bash
# Active le déploiement automatique : chaque push sur main met le site en ligne
# (voir .github/workflows/deploiement.yml). À lancer une fois, depuis le Mac,
# dans le dossier du projet :
#
#   bash deploy/activer-deploiement-auto.sh root@85.190.112.171
#
# Après un changement de .env.production, relancer avec --secrets pour
# n'envoyer que les secrets :
#
#   bash deploy/activer-deploiement-auto.sh root@85.190.112.171 --secrets
set -euo pipefail

HOTE="${1:?Usage : bash deploy/activer-deploiement-auto.sh root@ADRESSE_IP [--secrets]}"
IP="${HOTE#*@}"
cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo ".env.production manquant (voir deploy/LISEZMOI.md)."; exit 1; }

echo "== Secrets de production copiés sur le serveur"
# Mêmes exclusions que deployer.sh : le serveur garde sa base et son adresse.
grep -vE '^(DATABASE_URL|DIRECT_URL|VERCEL_[A-Z_]*|NODE_ENV|DEMO_OUVERTE|GOOGLE_REDIRECT_URI)=' .env.production \
  | ssh "$HOTE" 'install -m 600 -o root -g root /dev/stdin /srv/psy/config/env.production'
[ "${2:-}" = "--secrets" ] && { echo "Secrets à jour."; exit 0; }

echo "== Script de mise en ligne côté serveur"
ssh "$HOTE" 'install -m 750 -o root -g root /dev/stdin /usr/local/bin/psy-deployer' < deploy/serveur/psy-deployer

echo "== Utilisateur « deploie » et sa clé"
DOSSIER=$(mktemp -d)
trap 'rm -rf "$DOSSIER"' EXIT
ssh-keygen -q -t ed25519 -N "" -C "github-actions-deploiement" -f "$DOSSIER/cle"
# Commande forcée : cette clé ne peut que lancer psy-deployer, sans shell,
# sans redirection de port ni terminal (restrict).
{ printf 'restrict,command="sudo /usr/local/bin/psy-deployer" '; cat "$DOSSIER/cle.pub"; } \
  | ssh "$HOTE" 'set -e
    id deploie >/dev/null 2>&1 || useradd --create-home --shell /bin/sh deploie
    install -d -m 700 -o deploie -g deploie /home/deploie/.ssh
    install -m 600 -o deploie -g deploie /dev/stdin /home/deploie/.ssh/authorized_keys
    echo "deploie ALL=(root) NOPASSWD: /usr/local/bin/psy-deployer" > /etc/sudoers.d/psy-deploie
    chmod 440 /etc/sudoers.d/psy-deploie
    visudo -cf /etc/sudoers.d/psy-deploie >/dev/null'

# L'empreinte du serveur, lue par la connexion déjà authentifiée (et non par
# ssh-keyscan) : GitHub saura qu'il parle bien à ce serveur.
EMPREINTE="$IP $(ssh "$HOTE" 'cut -d" " -f1,2 /etc/ssh/ssh_host_ed25519_key.pub')"

echo "== Secrets GitHub du dépôt"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh secret set DEPLOY_SSH_KEY < "$DOSSIER/cle"
  gh secret set DEPLOY_HOST --body "$IP"
  gh secret set DEPLOY_KNOWN_HOSTS --body "$EMPREINTE"
  echo "Secrets posés. Le prochain push sur main met le site en ligne."
else
  echo "La commande gh n'est pas disponible ou pas connectée (brew install gh, puis gh auth login)."
  echo "Sinon, sur GitHub : Settings > Secrets and variables > Actions > New repository secret."
  echo
  echo "DEPLOY_HOST :"; echo "$IP"; echo
  echo "DEPLOY_KNOWN_HOSTS :"; echo "$EMPREINTE"; echo
  echo "DEPLOY_SSH_KEY (tout le bloc, lignes BEGIN et END comprises) :"
  cat "$DOSSIER/cle"
fi
