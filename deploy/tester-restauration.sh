#!/usr/bin/env bash
# Vérifie que les sauvegardes chiffrées se restaurent VRAIMENT.
#   bash deploy/tester-restauration.sh root@85.190.112.171
#
# Sur le serveur :
#   1. la dernière sauvegarde quotidienne existe et date de moins de 26 h ;
#   2. elle se déchiffre avec la clé du serveur ;
#   3. elle se restaure, sans erreur, dans une base TEMPORAIRE
#      (psy_test_restauration), effacée à la fin quoi qu'il arrive ;
#   4. ses tables ont le même nombre de lignes que la vraie base, à l'activité
#      du jour près ;
#   5. les notes de séance et les documents chiffrés qu'elle contient se
#      relisent avec NOTES_KEY (seule leur taille est affichée, jamais le texte).
#   La vraie base « psy » n'est que LUE, en transaction lecture seule.
#
# Sur ce Mac :
#   6. tes copies des clés (gestionnaire de mots de passe) sont les bonnes :
#      tu les colles, seule leur empreinte SHA-256 est comparée à celle du
#      serveur, la clé ne quitte jamais le Mac ;
#   7. la copie locale des sauvegardes (deploy/recuperer-sauvegardes.sh) est
#      récente, intacte et, si gpg est installé, se déchiffre avec ta clé.
set -uo pipefail
HOTE="${1:-root@85.190.112.171}"
SORTIE=$(mktemp)
trap 'rm -f "$SORTIE"' EXIT

ssh "$HOTE" bash -s <<'DISTANT' | tee "$SORTIE"
set -uo pipefail
TEST=psy_test_restauration
ECHECS=0
ok() { echo "  OK      $*"; }
ko() { echo "  ÉCHEC   $*"; ECHECS=$((ECHECS + 1)); }
DIR=$(mktemp -d /root/test-restauration.XXXXXX)
chmod 700 "$DIR"
nettoyer() {
  sudo -u postgres dropdb --if-exists "$TEST" 2>/dev/null
  rm -rf "$DIR"
  echo
  echo "Base temporaire $TEST effacée, fichiers déchiffrés supprimés."
}
trap nettoyer EXIT
# Requêtes sur la vraie base : transaction en lecture seule imposée.
reelle() { sudo -u postgres env PGOPTIONS='-c default_transaction_read_only=on' psql -d psy -XAt -c "$1"; }
test_() { sudo -u postgres psql -d "$TEST" -XAt -c "$1"; }

echo "== 1. Sauvegardes présentes sur le serveur"
ls -lt --time-style='+%d/%m/%Y %H:%M' /var/backups/psy | head -8 | sed 's/^/    /'
F=$(ls -1t /var/backups/psy/psy-*.dump.gpg 2>/dev/null | head -1)
[ -n "$F" ] || { ko "aucune sauvegarde quotidienne dans /var/backups/psy"; exit 1; }
AGE_H=$(( ($(date +%s) - $(stat -c %Y "$F")) / 3600 ))
if [ "$AGE_H" -le 26 ]; then ok "dernière : $(basename "$F"), faite il y a ${AGE_H} h"
else ko "la dernière sauvegarde ($(basename "$F")) a ${AGE_H} h : la tâche de 2 h 30 ne tourne plus ?"; fi
echo "          $(ls /var/backups/psy/psy-*.dump.gpg | wc -l) sauvegardes quotidiennes gardées, $(du -sh /var/backups/psy | cut -f1) au total"
grep -q psy-sauvegarde /etc/cron.d/pratique-psy 2>/dev/null && ok "tâche planifiée présente" || ko "tâche planifiée absente de /etc/cron.d/pratique-psy"
if [ -s /var/log/psy-sauvegarde.log ]; then
  echo "          Fin du journal des sauvegardes :"; tail -5 /var/log/psy-sauvegarde.log | sed 's/^/            /'
fi

echo; echo "== 2. Déchiffrement"
if gpg --batch --yes --quiet --passphrase-file /root/.psy-sauvegarde-cle \
     --decrypt -o "$DIR/s.dump" "$F" 2>"$DIR/gpg.err"; then
  ok "déchiffrée ($(du -h "$DIR/s.dump" | cut -f1) en clair)"
else
  ko "déchiffrement impossible : $(head -3 "$DIR/gpg.err")"; exit 1
fi

echo; echo "== 3. Contenu lisible par PostgreSQL"
LISTE=$(sudo -u postgres pg_restore --list < "$DIR/s.dump" 2>&1) || { ko "pg_restore ne lit pas le fichier : $LISTE"; exit 1; }
ok "$(grep -c 'TABLE DATA' <<<"$LISTE") tables avec leurs données"

echo; echo "== 4. Restauration dans la base temporaire $TEST"
[ "$TEST" != psy ] || exit 1
sudo -u postgres dropdb --if-exists "$TEST" 2>/dev/null
sudo -u postgres createdb "$TEST" || { ko "création de la base temporaire"; exit 1; }
DEBUT=$(date +%s)
if sudo -u postgres pg_restore --no-owner --no-acl --exit-on-error -d "$TEST" \
     < "$DIR/s.dump" 2>"$DIR/restore.err"; then
  ok "restaurée sans erreur en $(( $(date +%s) - DEBUT )) s"
else
  ko "restauration interrompue :"; tail -5 "$DIR/restore.err" | sed 's/^/            /'; exit 1
fi

echo; echo "== 5. Comparaison avec la vraie base (lecture seule)"
printf "    %-26s %11s %11s\n" "Table" "Sauvegarde" "Aujourd'hui"
VIDES_SUSPECTES=0
for t in $(test_ "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
  a=$(test_ "SELECT count(*) FROM public.\"$t\"")
  b=$(reelle "SELECT count(*) FROM public.\"$t\"" 2>/dev/null || echo "?")
  m=""; [ "$a" != "$b" ] && m="  (différent)"
  [ "$a" = 0 ] && [ "$b" != 0 ] && [ "$b" != "?" ] && { m="  ← VIDE dans la sauvegarde"; VIDES_SUSPECTES=$((VIDES_SUSPECTES + 1)); }
  printf "    %-26s %11s %11s%s\n" "$t" "$a" "$b" "$m"
done
[ "$VIDES_SUSPECTES" = 0 ] && ok "aucune table vide qui ne devrait pas l'être" || ko "$VIDES_SUSPECTES table(s) vide(s) dans la sauvegarde mais remplie(s) aujourd'hui"
echo "          Un petit écart est normal : la sauvegarde date de cette nuit."
DERNIERE=$(test_ "SELECT to_char((max(updated_at) AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Brussels', 'DD/MM/YYYY HH24:MI') FROM sessions" 2>/dev/null)
echo "          Dernière séance modifiée contenue dans la sauvegarde : ${DERNIERE:-?}"
echo "          Patients : $(test_ "SELECT count(*) FROM patients" 2>/dev/null || echo ?), séances : $(test_ "SELECT count(*) FROM sessions" 2>/dev/null || echo ?)"

echo; echo "== 6. Notes et documents chiffrés relisibles avec NOTES_KEY"
NK=$(grep "^NOTES_KEY=" /srv/psy/app/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
cat > "$DIR/relire.js" <<'JS'
const c = require("crypto");
const k = Buffer.from(process.env.K, "base64");
const brut = require("fs").readFileSync(0, "utf8").trim();
try {
  let iv, tag, ch;
  if (process.argv[2] === "note") {
    const p = brut.split(".");
    [iv, tag, ch] = [p[1], p[2], p[3]].map((x) => Buffer.from(x, "base64url"));
  } else {
    const b = Buffer.from(brut.replace(/\s/g, ""), "base64");
    [iv, tag, ch] = [b.subarray(0, 12), b.subarray(12, 28), b.subarray(28)];
  }
  const d = c.createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  console.log(Buffer.concat([d.update(ch), d.final()]).length + " octets");
} catch (e) {
  console.log("ERREUR " + e.message);
  process.exit(1);
}
JS
NB_NOTES=$(test_ "SELECT count(*) FROM sessions WHERE note LIKE 'v1.%'" 2>/dev/null || echo 0)
NB_DOCS=$(test_ "SELECT count(*) FROM documents_patient" 2>/dev/null || echo 0)
echo "          $NB_NOTES note(s) de séance chiffrée(s), $NB_DOCS document(s) joint(s) dans la sauvegarde"
if [ "$NB_NOTES" = 0 ] && [ "$NB_DOCS" = 0 ]; then
  echo "          Rien de chiffré à relire pour l'instant."
elif [ -z "$NK" ]; then
  ko "NOTES_KEY absente du serveur : les notes et documents de la sauvegarde sont illisibles"
else
  if [ "$NB_NOTES" != 0 ]; then
    R=$(test_ "SELECT note FROM sessions WHERE note LIKE 'v1.%' ORDER BY updated_at DESC LIMIT 1" | K="$NK" node "$DIR/relire.js" note)
    [[ "$R" == ERREUR* ]] && ko "note de séance : $R" || ok "la note de séance la plus récente se relit ($R)"
  fi
  if [ "$NB_DOCS" != 0 ]; then
    R=$(test_ "SELECT encode(contenu, 'base64') FROM documents_patient ORDER BY created_at DESC LIMIT 1" | K="$NK" node "$DIR/relire.js" doc)
    [[ "$R" == ERREUR* ]] && ko "document joint : $R" || ok "le document joint le plus récent se relit ($R)"
  fi
fi

# Empreintes pour la vérification sur le Mac (une empreinte ne révèle pas la clé).
echo "EMPREINTE_CLE_SAUVEGARDES=$(tr -d ' \n\r\t' < /root/.psy-sauvegarde-cle | sha256sum | cut -d' ' -f1)"
[ -n "$NK" ] && echo "EMPREINTE_NOTES_KEY=$(printf %s "$NK" | tr -d ' \n\r\t' | sha256sum | cut -d' ' -f1)"
for f in /var/backups/psy/psy-*.dump.gpg; do echo "FICHIER $(sha256sum "$f" | cut -d' ' -f1) $(basename "$f")"; done
echo "ECHECS_SERVEUR=$ECHECS"
DISTANT

val() { grep "^$1=" "$SORTIE" | tail -1 | cut -d= -f2-; }
[ -n "$(val ECHECS_SERVEUR)" ] || { echo; echo "Le test côté serveur s'est arrêté avant la fin (voir ci-dessus)."; exit 1; }
ECHECS=$(val ECHECS_SERVEUR)
ok() { echo "  OK      $*"; }
ko() { echo "  ÉCHEC   $*"; ECHECS=$((ECHECS + 1)); }

echo; echo "== 7. Tes copies des clés, hors serveur"
echo "   Colle chaque clé depuis ton gestionnaire de mots de passe (rien ne s'affiche),"
echo "   ou appuie sur Entrée pour passer. Seule son empreinte est comparée."
CLE_SAUVEGARDES=""
verifier_cle() { # $1 nom affiché, $2 empreinte attendue ; la clé lue reste dans K
  K=""
  read -r -s -p "   $1 : " K </dev/tty; echo
  K=$(printf %s "$K" | tr -d ' \n\r\t')
  if [ -z "$K" ]; then echo "  PASSÉ   $1 non vérifiée"; return 1; fi
  if [ -z "$2" ]; then echo "  ?       $1 : le serveur n'en a pas"; return 1; fi
  if [ "$(printf %s "$K" | shasum -a 256 | cut -d' ' -f1)" = "$2" ]; then
    ok "ta copie de $1 est la bonne"
  else
    ko "ta copie de $1 ne correspond PAS à celle du serveur"; return 1
  fi
}
verifier_cle "la clé des sauvegardes" "$(val EMPREINTE_CLE_SAUVEGARDES)" && CLE_SAUVEGARDES="$K"
verifier_cle "NOTES_KEY (notes de séance et documents)" "$(val EMPREINTE_NOTES_KEY)"
K=""

echo; echo "== 8. Copie locale des sauvegardes (~/Sauvegardes/pratique-psy)"
LOCAL="$HOME/Sauvegardes/pratique-psy"
L=$(ls -1t "$LOCAL"/psy-*.dump.gpg 2>/dev/null | head -1)
if [ -z "$L" ]; then
  ko "aucune copie sur ce Mac : lance  bash deploy/recuperer-sauvegardes.sh $HOTE"
else
  JOURS=$(( ($(date +%s) - $(stat -f %m "$L")) / 86400 ))
  [ "$JOURS" -le 7 ] && ok "dernière copie : $(basename "$L"), il y a $JOURS jour(s)" \
                     || ko "dernière copie : $(basename "$L"), il y a $JOURS jours (plus d'une semaine)"
  H=$(shasum -a 256 "$L" | cut -d' ' -f1)
  if grep -q "^FICHIER $H $(basename "$L")$" "$SORTIE"; then ok "identique au fichier du serveur"
  elif grep -q " $(basename "$L")$" "$SORTIE"; then ko "différente du fichier du serveur (copie abîmée ?)"
  else echo "          (le serveur n'a plus ce fichier, comparaison impossible)"; fi
  if [ -n "$CLE_SAUVEGARDES" ] && command -v gpg >/dev/null; then
    ENTETE=$(printf %s "$CLE_SAUVEGARDES" | gpg --batch --quiet --pinentry-mode loopback \
               --passphrase-fd 0 --decrypt "$L" 2>/dev/null | head -c 5)
    [ "$ENTETE" = PGDMP ] && ok "se déchiffre sur ce Mac avec ta clé : c'est bien une sauvegarde PostgreSQL" \
                          || ko "ne se déchiffre pas sur ce Mac avec ta clé"
  elif [ -n "$CLE_SAUVEGARDES" ]; then
    echo "          gpg n'est pas installé sur ce Mac (brew install gnupg) : déchiffrement local non testé."
  fi
fi
CLE_SAUVEGARDES=""

echo
if [ "$ECHECS" = 0 ]; then echo "RÉSULTAT : tout est bon."
else echo "RÉSULTAT : $ECHECS point(s) en échec, voir ci-dessus."; fi
