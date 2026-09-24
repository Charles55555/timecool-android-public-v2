#!/bin/bash
#
# Lance toutes les suites de verification, et echoue si l'une echoue.
#
# La boucle precedente enchainait « node ... | tail -1 » : le code de
# sortie etait celui de tail, jamais celui du test. Deux livraisons
# sont ainsi parties avec une suite rouge. PIPESTATUS rend le vrai
# resultat.
#
# Usage :  bash verifier.sh                 (depuis la racine du depot)
set -u

PAGE=app/src/main/assets/index.html
API=backend/api/index.php
D=${TC_SUITES:-$(cd "$(dirname "$0")" && pwd)}

rouge=0

lancer() {
  local nom=$1; shift
  [ -f "$D/$nom.js" ] || { printf '%-26s absente\n' "$nom"; return; }
  local sortie
  sortie=$(node "$D/$nom.js" "$@" 2>&1)
  local code=${PIPESTATUS[0]}
  if [ "$code" -eq 0 ]; then
    printf '%-26s %s\n' "$nom" "$(printf '%s\n' "$sortie" | tail -1)"
  else
    rouge=1
    printf '%-26s ECHEC\n' "$nom"
    printf '%s\n' "$sortie" | grep -E '^\s+KO |Error|error' | head -6
  fi
}

lancer verif-syntaxe          "$PAGE"
lancer verif-iphone           "$PAGE"
lancer verif-hauteurs         "$PAGE"
lancer verif-periode          "$PAGE"
lancer verif-charly-periode   "$PAGE"
lancer verif-nouveau-rdv      "$PAGE"
lancer verif-dispo            "$PAGE"
lancer verif-contacts-reglette "$PAGE"
lancer verif-passerelle       "$PAGE"
lancer verif-filtre-timecool  "$PAGE"
lancer verif-messagerie       "$PAGE"
lancer verif-groupe           "$PAGE"
lancer verif-coordonnees      "$PAGE"
lancer verif-tirer            "$PAGE"
lancer verif-lieu-rappel      "$PAGE"
lancer verif-rappels          "$PAGE"
lancer verif-itineraire       "$PAGE"
lancer verif-langue-contact   "$PAGE"
lancer verif-noms-langues     "$PAGE"
lancer verif-original         "$PAGE"
lancer verif-rappel-email     "$PAGE" "$API"
lancer verif-langue           "$PAGE" "$API"
lancer verif-langue-imposee   "$PAGE" "$API"
lancer verif-attente-charly   "$PAGE"
lancer verif-contact-rdv      "$PAGE"
lancer verif-creneaux-proposes "$PAGE"


# Retrouvees hors du lanceur, et vertes : elles y reviennent.
lancer verif-agenda-feries    "$PAGE" "$API"
lancer verif-anniversaires    "$PAGE" "$API"
lancer verif-appairage-e2e    "$PAGE" "$API"
lancer verif-bandeau-live     "$PAGE" "$API"
lancer verif-couleurs         "$PAGE" "$API"
lancer verif-faux-boutons     "$PAGE" "$API"
lancer verif-fenetre          "$PAGE" "$API"
lancer verif-feries           "$PAGE" "$API"
lancer verif-formulaires      "$PAGE" "$API"
lancer verif-import           "$PAGE" "$API"
lancer verif-interrupteurs    "$PAGE" "$API"
lancer verif-islam-repli      "$PAGE" "$API"
lancer verif-maj              "$PAGE" "$API"
lancer verif-messages-config  "$PAGE" "$API"
lancer verif-navigate         "$PAGE" "$API"
lancer verif-prompt           "$PAGE" "$API"
lancer verif-rdv-e2e          "$PAGE" "$API"
lancer verif-retour           "$PAGE" "$API"
lancer verif-statistiques     "$PAGE" "$API"
lancer verif-sync             "$PAGE" "$API"
lancer verif-sync-e2e         "$PAGE" "$API"
lancer verif-taches           "$PAGE" "$API"
lancer verif-texte-invitation "$PAGE" "$API"
lancer verif-transfert        "$PAGE" "$API"
lancer verif-tri              "$PAGE" "$API"

echo
if [ "$rouge" -eq 0 ]; then
  echo "Tout est vert."
else
  echo "Au moins une suite est rouge : ne pas livrer."
fi
exit "$rouge"
