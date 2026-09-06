#!/bin/bash
#
# Deploie l'application web sur timecool.fr/app/.
#
# Deux precautions, chacune payee une fois :
#
# 1. Jamais `cp`. Il remplace proprietaire et droits du fichier, que
#    Plesk reprend ensuite a sa facon. `tee` ecrit DANS le fichier
#    existant et laisse les deux intacts.
#
# 2. L'horodatage du deploiement est inscrit dans la page ET publie
#    dans version.json. C'est leur comparaison qui fait apparaitre le
#    bandeau « Nouvelle version disponible » chez ceux qui ont deja la
#    page ouverte ou une copie en cache. Se fier au cache du navigateur
#    ne marcherait pas : le serveur n'envoie pas de Cache-Control, il a
#    donc le droit de resservir une copie perimee pendant des heures.
#
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$RACINE/app/src/main/assets/index.html"
CIBLE=/var/www/vhosts/timecool.fr/httpdocs/app

[ -f "$SOURCE" ] || { echo "Source introuvable : $SOURCE" >&2; exit 1; }
[ -d "$CIBLE" ]  || { echo "Cible introuvable : $CIBLE"  >&2; exit 1; }

HORODATAGE=$(date +%s)

grep -q '__TC_DEPLOIEMENT__' "$SOURCE" \
  || { echo "Marqueur __TC_DEPLOIEMENT__ absent de la source." >&2; exit 1; }

sed "s/__TC_DEPLOIEMENT__/$HORODATAGE/" "$SOURCE" | tee "$CIBLE/index.html" > /dev/null
printf '{"deploiement":"%s"}\n' "$HORODATAGE" | tee "$CIBLE/version.json" > /dev/null
chmod 644 "$CIBLE/version.json"

echo "Deploye — horodatage $HORODATAGE ($(date -d "@$HORODATAGE" '+%d/%m/%Y %Hh%M'))"
