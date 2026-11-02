#!/bin/bash
# Mission 70 : efface les comptes de test (e-mail en @exemple-timecool.fr) et leurs données.
# Même logique que compteEffacer() de l'API ; aucun autre compte n'est concerné.
#
#   bash scripts/purger-comptes-test.sh --compter       ne fait que compter
#   bash scripts/purger-comptes-test.sh --effacer       sauvegarde, vérifie la sauvegarde, efface
#   bash scripts/purger-comptes-test.sh --fichiers LISTE  (en root) efface les dossiers de documents
#
# TC_PURGE_ESSAI=motif (LIKE) réduit la purge aux comptes de test qui commencent par ce motif (essais).
set -u
umask 077

DOMAINE='@exemple-timecool.fr'
DOCUMENTS=${TC_DOCUMENTS:-/var/www/vhosts/timecool.fr/private/documents}
SAUVEGARDES=~/sauvegardes-base
TABLES="comptes cles_api appairages elements convocation_reponses google_agenda google_agenda_liens rappels_envoyes rdv commentaires contacts documents sessions rapports_techniques groupes cles_publiques groupe_membres rdv_creneaux rdv_liens convocations verifications"
PAQUET=500

sql() { mysql --no-defaults -u claudecode -N -B timecool_prod -e "$1"; }

COND="RIGHT(LOWER(email), ${#DOMAINE}) = '$DOMAINE'"
ESSAI=${TC_PURGE_ESSAI:-}
if [ -n "$ESSAI" ]; then
  case "$ESSAI" in *[!a-z0-9.-]*) echo "Motif d'essai refusé."; exit 2 ;; esac
  COND="$COND AND email LIKE '$ESSAI%'"
fi

compter() {
  echo "$1"
  sql "SELECT CASE WHEN email LIKE 'e2erdv%' THEN 'e2erdv' WHEN email LIKE 'sonde.%' THEN 'sonde' ELSE 'autres' END f, COUNT(*)
         FROM comptes WHERE $COND GROUP BY f ORDER BY f" | awk -F'\t' '{printf "  %-8s %s\n", $1, $2}'
  echo "  à effacer : $(sql "SELECT COUNT(*) FROM comptes WHERE $COND")"
  echo "  vrais comptes : $(vrais)"
}
vrais() { sql "SELECT COUNT(*) FROM comptes WHERE RIGHT(LOWER(email), ${#DOMAINE}) <> '$DOMAINE'"; }

mode=${1:-}
case "$mode" in
  --compter)
    compter "Comptes de test :"
    echo "  documents : $(sql "SELECT COUNT(*) FROM documents WHERE compte_id IN (SELECT id FROM comptes WHERE $COND)")"
    echo "  fiches de vrais comptes liées à un compte de test (le lien sera retiré, la fiche reste) : $(sql "SELECT COUNT(*) FROM contacts WHERE compte_lie_id IN (SELECT id FROM comptes WHERE $COND) AND compte_id NOT IN (SELECT id FROM comptes WHERE $COND)")"
    echo "  rendez-vous de vrais comptes avec un invité de test (l'invité sera retiré, le rendez-vous reste) : $(sql "SELECT COUNT(*) FROM rdv WHERE invite_compte_id IN (SELECT id FROM comptes WHERE $COND) AND organisateur_id NOT IN (SELECT id FROM comptes WHERE $COND)")"
    echo "  rendez-vous organisés par un compte de test avec un vrai invité (ils partent avec lui) : $(sql "SELECT COUNT(*) FROM rdv WHERE organisateur_id IN (SELECT id FROM comptes WHERE $COND) AND invite_compte_id IS NOT NULL AND invite_compte_id NOT IN (SELECT id FROM comptes WHERE $COND)")"
    echo "  comptes de test administrateurs : $(sql "SELECT COUNT(*) FROM comptes WHERE $COND AND admin = 1")"
    exit 0
    ;;
  --fichiers)
    liste=${2:-}
    [ -f "$liste" ] || { echo "Liste introuvable."; exit 2; }
    [ -d "$DOCUMENTS" ] || { echo "Dossier des documents introuvable : $DOCUMENTS"; exit 2; }
    n=0
    while read -r id; do
      case "$id" in ''|*[!0-9]*) echo "Ligne ignorée : $id"; continue ;; esac
      [ -d "$DOCUMENTS/$id" ] || continue
      rm -f "$DOCUMENTS/$id"/*.bin
      rmdir "$DOCUMENTS/$id" && n=$((n + 1))
    done < "$liste"
    echo "$n dossiers de documents effacés."
    exit 0
    ;;
  --effacer) ;;
  *) echo "Usage : $0 --compter | --effacer | --fichiers LISTE"; exit 2 ;;
esac

compter "Avant :"
total_comptes=$(sql "SELECT COUNT(*) FROM comptes")
vrais_avant=$(vrais)
[ "$(sql "SELECT COUNT(*) FROM comptes WHERE $COND")" -gt 0 ] || { echo "Rien à effacer."; exit 0; }

# 1. La sauvegarde, puis sa vérification : rien n'est effacé avant.
mkdir -p "$SAUVEGARDES"
horo=$(date +%d-%m-%Y-%H%M)
dump="$SAUVEGARDES/purge-$horo.sql.gz"
mysqldump --no-defaults -u claudecode --single-transaction --no-tablespaces --quick --skip-extended-insert timecool_prod $TABLES | gzip > "$dump"
codes=("${PIPESTATUS[@]}")
if [ "${codes[0]}" -ne 0 ] || [ "${codes[1]}" -ne 0 ]; then echo "Sauvegarde en échec : rien n'est effacé."; exit 3; fi
gzip -t "$dump" || { echo "Sauvegarde illisible : rien n'est effacé."; exit 3; }
lignes=$(gzip -dc "$dump" | grep -c '^INSERT INTO `comptes`')
if [ "$lignes" -lt "$total_comptes" ]; then
  echo "Sauvegarde incomplète ($lignes comptes sur $total_comptes) : rien n'est effacé."; exit 3
fi
echo "Sauvegarde : $dump ($(du -h "$dump" | cut -f1), $lignes comptes)"

# 2. L'effacement, par paquets, chacun dans sa transaction.
ids=$(mktemp)
trap 'rm -f "$ids"' EXIT
sql "SELECT id FROM comptes WHERE $COND ORDER BY id" > "$ids"
liste_dossiers="$SAUVEGARDES/purge-$horo-dossiers.txt"
cp "$ids" "$liste_dossiers"
fait=0
while :; do
  paquet=$(sed -n "$((fait + 1)),$((fait + PAQUET))p" "$ids" | paste -sd, -)
  [ -n "$paquet" ] || break
  sql "START TRANSACTION;
    DELETE FROM commentaires WHERE compte_id IN ($paquet);
    DELETE FROM rappels_envoyes WHERE compte_id IN ($paquet);
    DELETE r FROM rapports_techniques r JOIN comptes c ON r.compte_id = c.id OR r.compte_ref IN (c.email, c.reference) WHERE c.id IN ($paquet) AND $(printf '%s' "$COND" | sed 's/email/c.email/g');
    DELETE v FROM verifications v JOIN comptes c ON v.destination IN (c.email, c.telephone) WHERE c.id IN ($paquet) AND $(printf '%s' "$COND" | sed 's/email/c.email/g');
    DELETE FROM comptes WHERE id IN ($paquet) AND $COND;
    COMMIT;" || { echo "Arrêt sur erreur après $fait comptes (le paquet en cours est annulé)."; exit 4; }
  fait=$((fait + PAQUET))
done

# 3. Le bilan.
compter "Après :"
vrais_apres=$(vrais)
if [ "$vrais_apres" != "$vrais_avant" ]; then
  echo "ATTENTION : vrais comptes $vrais_avant avant, $vrais_apres après. Sauvegarde : $dump"; exit 5
fi
echo "Vrais comptes inchangés : $vrais_avant avant, $vrais_apres après."

# 4. Les fichiers joints.
if [ -z "$ESSAI" ] && [ -w "$DOCUMENTS" ]; then
  bash "$0" --fichiers "$liste_dossiers"
else
  echo "Fichiers joints : à effacer par root (dossier protégé) :"
  echo "  bash $(readlink -f "$0") --fichiers $liste_dossiers"
fi
