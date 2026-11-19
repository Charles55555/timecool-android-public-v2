#!/bin/bash
#
# Mission 140 (Charles, 19/11) : les icones de TimeCool installable depuis le navigateur (web/app/), tirees de l'icone de
# l'application : les etoiles sur fond blanc (choix de Charles, dessinee par dessiner-icone.py, ios/.../icone-1024.png).
# L'onglet du navigateur garde l'horloge (favicon.ico, icon.svg) : ces icones ne servent qu'a TimeCool installe.
# Le serveur n'a ni ImageMagick ni PIL : Chrome sans tete les dessine a la bonne taille.
#
# Usage : TC_CHROME=~/outils-tc/chrome bash scripts/dessiner-icones-web.sh
#
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$RACINE/ios/TimeCool/Assets.xcassets/AppIcon.appiconset/icone-1024.png"
CIBLE="$RACINE/web/app"
CHROME="${TC_CHROME:?TC_CHROME : le chemin de Chrome}"

[ -f "$SOURCE" ] || { echo "Icone introuvable : $SOURCE" >&2; exit 1; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp "$SOURCE" "$TMP/icone-1024.png"
mkdir -p "$CIBLE"

# dessiner <cote en px> <part du dessin en %> <nom>
dessiner() {
  printf '<!doctype html><html><head><style>html,body{margin:0;width:%spx;height:%spx;background:#fff;overflow:hidden}img{position:absolute;left:50%%;top:50%%;width:%s%%;height:%s%%;transform:translate(-50%%,-50%%)}</style></head><body><img src="icone-1024.png"></body></html>' "$1" "$1" "$2" "$2" > "$TMP/p.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 \
    --window-size="$1,$1" --user-data-dir="$TMP/profil" --screenshot="$CIBLE/$3" "file://$TMP/p.html" > /dev/null 2>&1
  [ -s "$CIBLE/$3" ] || { echo "Echec : $3" >&2; exit 1; }
  echo "dessinee : web/app/$3"
}

dessiner 192 100 icone-192.png
dessiner 512 100 icone-512.png
# Masquable : Android decoupe l'icone (rond, goutte…) ; le dessin reste dans le cercle de securite (80 %).
dessiner 512 80 icone-masquable-512.png
# iPhone : « Sur l'ecran d'accueil » prend apple-touch-icon (180 px, sans transparence).
dessiner 180 100 icone-180.png
