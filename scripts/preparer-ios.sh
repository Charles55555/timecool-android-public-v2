#!/bin/bash
#
# Prépare le projet iPhone avant compilation.
#
# Une seule chose à comprendre : **la page est unique.** Elle vit dans
# app/src/main/assets/index.html, sert à Android, au site web et à
# l'iPhone. Ce script la recopie dans le projet Apple.
#
# Ne jamais modifier la copie : elle est écrasée à chaque exécution.
# Toute correction se fait dans l'original, et profite aux trois.
#
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$RACINE/app/src/main/assets/index.html"
CIBLE="$RACINE/ios/TimeCool/web"

[ -f "$SOURCE" ] || { echo "Page introuvable : $SOURCE" >&2; exit 1; }

mkdir -p "$CIBLE"
cp "$SOURCE" "$CIBLE/index.html"

# Les deux bibliothèques que la page charge depuis son propre dossier :
# sans elles, la lecture du QR code d'appairage échoue en silence.
for lib in jsqr.min.js qrgen.min.js; do
    chemin="/var/www/vhosts/timecool.fr/httpdocs/app/$lib"
    if [ -f "$chemin" ]; then
        cp "$chemin" "$CIBLE/$lib"
    else
        echo "  ⚠️  $lib introuvable — le scan de QR code ne marchera pas"
    fi
done

octets=$(wc -c < "$CIBLE/index.html")
echo "Page copiée : $octets octets"
ls -1 "$CIBLE"
