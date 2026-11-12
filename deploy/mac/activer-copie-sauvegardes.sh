#!/usr/bin/env bash
# Installe sur ce Mac la copie hebdomadaire des sauvegardes du serveur
# (lundi 12 h, et à chaque ouverture de session ; le Mac doit être allumé).
#   bash deploy/mac/activer-copie-sauvegardes.sh            # installer / mettre à jour
#   bash deploy/mac/activer-copie-sauvegardes.sh --retirer  # désinstaller
# Journal : ~/Sauvegardes/copie.log. En cas d'échec, une notification s'affiche.
set -euo pipefail
NOM=be.pratiquepsy.copie-sauvegardes
CIBLE="$HOME/Library/LaunchAgents/$NOM.plist"
launchctl bootout "gui/$(id -u)/$NOM" 2>/dev/null || true
if [ "${1:-}" = "--retirer" ]; then rm -f "$CIBLE"; echo "Copie automatique retirée."; exit 0; fi
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Sauvegardes/pratique-psy"
sed "s#__HOME__#$HOME#g" "$(dirname "$0")/$NOM.plist" > "$CIBLE"
plutil -lint "$CIBLE" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$CIBLE"
echo "Installée. Première copie lancée, résultat dans quelques secondes :"
sleep 8
tail -2 "$HOME/Sauvegardes/copie.log" 2>/dev/null || echo "(pas encore de journal : regarde ~/Sauvegardes/copie.log dans une minute)"
