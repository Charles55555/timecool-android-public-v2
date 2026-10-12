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
lancer verif-cle-appareil     "$PAGE"
lancer verif-charly-suppression "$PAGE"
lancer verif-charly-deplacement "$PAGE"
lancer verif-attente-contact  "$PAGE"
lancer verif-suppression-plage "$PAGE"
lancer verif-valider-par-texte "$PAGE"
lancer verif-contacts-mots-utiles "$PAGE"
lancer verif-memoire-agenda "$PAGE"
lancer verif-historique-charly "$PAGE"
lancer verif-temps-libre "$PAGE"
lancer verif-categories-titre "$PAGE"
lancer verif-couleur-temps-libre "$PAGE"
lancer verif-palette-pastel "$PAGE"
lancer verif-formules-charly "$PAGE"
lancer verif-horaires "$PAGE"
lancer verif-doublons "$PAGE"
lancer verif-iphone           "$PAGE"
lancer verif-hauteurs         "$PAGE"
lancer verif-periode          "$PAGE"
lancer verif-voyage-contrainte  "$PAGE"
lancer verif-contrainte         "$PAGE"
lancer verif-non-compris         "$PAGE"
lancer verif-titre-messagerie    "$PAGE"
lancer verif-onglets-charly      "$PAGE"
lancer verif-charly-periode   "$PAGE"
lancer verif-nouveau-rdv      "$PAGE"
lancer verif-confirmation-ajout "$PAGE"
lancer verif-consulter-agenda   "$PAGE"
lancer verif-zones-rayees       "$PAGE"
lancer verif-fiche-lieu-avec    "$PAGE"
lancer verif-imprevu            "$PAGE"
lancer banc-charly              "$PAGE"
lancer verif-deplacer-periode   "$PAGE"
lancer verif-autocompletion-lieu "$PAGE"
lancer verif-marche-arriere     "$PAGE"
lancer verif-bulles-charly      "$PAGE"
lancer verif-panneau-mois       "$PAGE"
lancer verif-premier-jour-semaine "$PAGE"
lancer verif-deplacer-au-doigt "$PAGE"
lancer verif-retour-conversation "$PAGE"
lancer verif-retour-partout "$PAGE"
lancer verif-bloc-demi-case "$PAGE"
lancer verif-google-agenda-depart "$PAGE" "$API"
lancer verif-page-google        "$PAGE" "$API"
lancer verif-menu-ancien-agenda "$PAGE"
lancer verif-google-revue       "$PAGE" "$API"
lancer verif-campagne1          "$PAGE" "$API"
lancer verif-dispos-serveur      "$PAGE" "$API"
lancer verif-prevenir-fiche      "$PAGE" "$API"
lancer verif-deux-onglets        "$PAGE"
lancer verif-rdv-groupe          "$PAGE" "$API"
lancer verif-acces-agenda        "$PAGE" "$API"
lancer verif-google-web          "$PAGE" "$API"
lancer verif-dispo            "$PAGE"
lancer verif-type-rdv         "$PAGE" "$API"
lancer verif-qui-ecrit        "$PAGE" "$API"
lancer verif-contacts-classes "$PAGE" "$API"
lancer verif-crayons-fiche    "$PAGE"
lancer verif-panneaux-centres "$PAGE"
lancer verif-validation-rdv   "$PAGE" "$API"
lancer verif-blocage-silence  "$PAGE" "$API"
lancer verif-absence          "$PAGE" "$API"
lancer verif-refus-simple     "$PAGE" "$API"
lancer verif-temps-protege    "$PAGE" "$API"
lancer verif-contacts-reglette "$PAGE"
lancer verif-passerelle       "$PAGE"
lancer verif-filtre-timecool  "$PAGE"
lancer verif-contacts-recents "$PAGE" "$API"
lancer verif-conversation-fiche "$PAGE"
lancer verif-toast-et-accueil "$PAGE"
lancer verif-charly-dates "$PAGE"
lancer verif-charly-conflits "$PAGE"
lancer verif-menu-agendas "$PAGE"
lancer verif-charly-citations "$PAGE"
lancer verif-charly-campagne7 "$PAGE"
lancer verif-charly-campagne8 "$PAGE"
lancer verif-charly-campagne9 "$PAGE"
lancer verif-charly-campagne10 "$PAGE"
lancer verif-charly-relance "$PAGE"
lancer verif-charly-notes-internes "$PAGE"
lancer verif-charly-jamais-inventer "$PAGE"
lancer verif-deconnexion "$PAGE"
lancer verif-accents-accueil "$PAGE"
lancer verif-boutons-charly "$PAGE"
lancer verif-saisie-charly "$PAGE"
lancer verif-toucher-plage "$PAGE"
lancer verif-journal-periode "$PAGE"
lancer verif-types-rdv "$PAGE"
lancer verif-sync-local-gagne "$PAGE"
lancer verif-bande-semaine "$PAGE"
lancer verif-ligne-semaine "$PAGE"
lancer verif-compte-langue-theme "$PAGE" "$API"
lancer verif-contraste-sombre "$PAGE"
lancer verif-reglages-compte-simule "$PAGE"
lancer verif-titre-agenda "$PAGE"
lancer verif-agendas-visibles "$PAGE"
lancer verif-agendas-recharges "$PAGE"
lancer verif-mon-agenda "$PAGE"
lancer verif-presentation-charly "$PAGE"
lancer verif-vocabulaire-formulaire "$PAGE" "$API"
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
lancer verif-cache-prompt      "$PAGE"
lancer verif-initiales         "$PAGE"
lancer verif-profil-cartes    "$PAGE"
lancer verif-messages          "$PAGE"


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
lancer verif-validation-rdv-e2e "$PAGE" "$API"
lancer verif-blocage-silence-e2e "$PAGE" "$API"
lancer verif-absence-e2e "$PAGE" "$API"
lancer verif-refus-simple-e2e "$PAGE" "$API"
lancer verif-temps-protege-e2e "$PAGE" "$API"
lancer verif-contacts-classes-e2e "$PAGE" "$API"
lancer verif-qui-ecrit-e2e    "$PAGE" "$API"
lancer verif-type-rdv-e2e     "$PAGE" "$API"
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
