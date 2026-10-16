#!/usr/bin/env bash
# PDF de la documentation, en une commande :
#
#   bash scripts/pdf-documentation.sh
#
# Prépare une base Postgres jetable (port 5544, aucune donnée réelle), lance
# l'outil dessus en local (port 3100), photographie la page imprimable
# /admin/documentation/complete avec Chrome, puis range tout. Le PDF est écrit
# dans exports/Documentation-Amapsy.pdf. Compter une minute et demie.
#
# Les captures d'écran sont celles de public/documentation/ : pour les
# rafraîchir d'abord, lancer scripts/capturer-documentation.ts (voir son
# en-tête).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_DIR=/tmp/docs-pg
export LC_ALL=en_US.UTF-8
export DATABASE_URL=postgresql://docs@localhost:5544/docs
# La CLI Prisma lit DIRECT_URL en priorité, et .env.local y met la base Neon :
# sans cette ligne, `prisma migrate deploy` migrerait Neon au lieu de la base
# jetable.
export DIRECT_URL="$DATABASE_URL"
# `next start` charge .env.production, donc les vrais identifiants SMTP : un clic
# sur « envoyer par e-mail » dans l'outil de test écrirait vraiment, depuis la
# vraie boîte. Un serveur en « .invalid » ne se résout jamais : rien ne peut
# partir, et l'outil se croit pourtant branché (la carte « À compléter » ne
# réclame pas de messagerie sur les captures).
export SMTP_HOST="smtp.example.invalid"
# Statuts fictifs de sauvegarde et de restauration, écrits par le script de capture.
export STATUT_SAUVEGARDE=/tmp/docs-sauvegarde.json
export STATUT_RESTAURATION=/tmp/docs-restauration.json

[ -f .env.local ] || { echo "Il manque .env.local (AUTH_SECRET)."; exit 1; }
AUTH_SECRET="$(grep '^AUTH_SECRET=' .env.local | cut -d= -f2- | tr -d '"')"
[ -n "$AUTH_SECRET" ] || { echo "AUTH_SECRET est vide dans .env.local."; exit 1; }
export AUTH_SECRET
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || { echo "Google Chrome est requis."; exit 1; }
command -v pg_ctl >/dev/null || { echo "PostgreSQL est requis (brew install postgresql@16)."; exit 1; }

nettoyer() {
  [ -n "${SERVEUR_PID:-}" ] && kill "$SERVEUR_PID" 2>/dev/null || true
  pg_ctl -D "$PG_DIR" stop -m fast >/dev/null 2>&1 || true
}
trap nettoyer EXIT

echo "== Base jetable"
if [ ! -d "$PG_DIR" ]; then
  initdb -D "$PG_DIR" -U docs -A trust --locale=en_US.UTF-8 >/dev/null
fi
# Déjà lancée (une séance de travail précédente) : on la réutilise.
pg_isready -q -h localhost -p 5544 || pg_ctl -D "$PG_DIR" -o "-p 5544" -l /tmp/docs-pg.log -w start >/dev/null
createdb -h localhost -p 5544 -U docs docs 2>/dev/null || true
npx prisma migrate deploy >/dev/null

echo "== Outil local"
[ -d node_modules/puppeteer-core ] || npm i --no-save puppeteer-core >/dev/null 2>&1
npx next build >/dev/null
npx next start -p 3100 >/tmp/docs-next.log 2>&1 &
SERVEUR_PID=$!
for _ in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:3100/connexion && break
  sleep 1
done

echo "== PDF"
npx tsx scripts/generer-pdf-documentation.ts
echo "Terminé : exports/Documentation-Amapsy.pdf"
