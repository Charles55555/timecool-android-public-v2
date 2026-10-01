#!/bin/bash
#
# Sentinelle TimeCool — tourne chaque minute (cron de claudecode).
#
# 1. Vérifie que l'API et la version web répondent, et repère toute
#    nouvelle erreur fatale PHP dans le journal de l'API.
# 2. Si l'API tombe juste après une mise en ligne, remet la dernière
#    version qui marchait : une coupure d'une minute plutôt qu'une panne
#    qui dure jusqu'à ce que quelqu'un s'en aperçoive.
# 3. Réveille la session Claude du serveur (tmux « timecool ») avec un
#    message [SENTINELLE] : elle cherche la cause, corrige si c'est
#    simple, et prévient Charles par notification. Si la session ne
#    tourne pas, un e-mail part à sa place.
#
# Une panne n'est déclarée qu'à la deuxième vérification ratée de suite :
# un réseau qui hoquette une seconde ne doit réveiller personne.
#
# Essai sans rien toucher :  SENTINELLE_ESSAI=1 bash scripts/sentinelle.sh
# (les URL et chemins ci-dessous peuvent être remplacés de la même façon)

set -u

API=${SENTINELLE_API:-https://api.timecool.fr/sante}
WEB=${SENTINELLE_WEB:-https://timecool.fr/app/version.json}
JOURNAL_API=${SENTINELLE_JOURNAL:-/var/www/vhosts/system/api.timecool.fr/logs/error_log}
PROD_API=${SENTINELLE_PROD_API:-/var/www/vhosts/timecool.fr/site1/index.php}
ETAT=${SENTINELLE_ETAT:-$HOME/.timecool-sentinelle}
SESSION=${SENTINELLE_SESSION:-timecool}
EMAIL=${SENTINELLE_EMAIL:-5@dentalcortex.fr}
ESSAI=${SENTINELLE_ESSAI:-0}

# Une mise en ligne plus récente que ça, suivie d'une panne : on revient en arrière.
RETOUR_MINUTES=30
# Une version qui tient depuis ça est réputée saine, et gardée comme repli.
SAINE_MINUTES=5

mkdir -p "$ETAT"
exec 9>"$ETAT/verrou"
flock -n 9 || exit 0     # le passage précédent n'a pas fini : on le laisse

maintenant=$(date +%s)
heure() { TZ=Europe/Paris date '+%d/%m %Hh%M'; }
lire() { cat "$ETAT/$1" 2>/dev/null || echo "${2:-}"; }
ecrire() { printf '%s' "$2" > "$ETAT/$1.tmp" && mv "$ETAT/$1.tmp" "$ETAT/$1"; }

# Prévient : la session Claude si elle tourne, sinon par e-mail.
prevenir() {
  local message="[SENTINELLE $(heure)] $1"
  printf '%s %s\n' "$(date -u '+%F %T')" "$message" >> "$ETAT/historique.log"
  if [ "$ESSAI" = 1 ]; then
    echo "ESSAI — préviendrait : $message"
    return
  fi
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    # Texte littéral (-l), puis Entrée à part : le message part tel quel.
    tmux send-keys -t "$SESSION" -l "$message"
    tmux send-keys -t "$SESSION" Enter
  else
    printf '%s\n\nLa session Claude du serveur ne tourne pas : personne n a pu intervenir.\n' "$message" \
      | mail -s "PANNE APPLICATION TIMECOOL SUR LE SERVEUR" "$EMAIL"
  fi
}

# ── 1. Les vérifications ────────────────────────────────────────────
problemes=()

reponse=$(curl -s -m 15 -w '\n%{http_code}' "$API" 2>/dev/null)
code=${reponse##*$'\n'}
if [ "$code" != 200 ] || ! printf '%s' "$reponse" | grep -q '"ok":true'; then
  problemes+=("l'API ne répond pas (code ${code:-aucun})")
  api_tombee=1
else
  api_tombee=0
fi

code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$WEB" 2>/dev/null)
[ "$code" = 200 ] || problemes+=("la version web ne répond pas (code ${code:-aucun})")

# Erreurs fatales PHP apparues depuis le dernier passage.
if [ -r "$JOURNAL_API" ]; then
  taille=$(stat -c %s "$JOURNAL_API")
  depuis=$(lire position_journal "$taille")
  [ "$taille" -lt "$depuis" ] && depuis=0      # journal renouvelé
  nouvelles=$(tail -c +"$((depuis + 1))" "$JOURNAL_API" | grep -c 'PHP Fatal error')
  if [ "$nouvelles" -gt 0 ]; then
    exemple=$(tail -c +"$((depuis + 1))" "$JOURNAL_API" | grep 'PHP Fatal error' | tail -1 \
      | sed -E 's/.*PHP Fatal error: +//; s/\\n.*//' | cut -c1-160)
    problemes+=("$nouvelles erreur(s) fatale(s) PHP dans l'API, dont : $exemple")
  fi
  ecrire position_journal "$taille"
fi

# ── 2. Repli sur la dernière version saine de l'API ─────────────────
if [ "$api_tombee" = 0 ] && [ -r "$PROD_API" ]; then
  modif=$(stat -c %Y "$PROD_API")
  if [ $((maintenant - modif)) -ge $((SAINE_MINUTES * 60)) ] \
     && ! cmp -s "$PROD_API" "$ETAT/api-saine.php"; then
    cp "$PROD_API" "$ETAT/api-saine.php.tmp" && mv "$ETAT/api-saine.php.tmp" "$ETAT/api-saine.php"
  fi
fi

# ── 3. Décider ──────────────────────────────────────────────────────
echecs=$(lire echecs_de_suite 0)
etat=$(lire etat OK)

if [ ${#problemes[@]} -eq 0 ]; then
  ecrire echecs_de_suite 0
  if [ "$etat" = PANNE ]; then
    ecrire etat OK
    prevenir "Résolu : TimeCool répond de nouveau normalement."
  fi
  exit 0
fi

# Une erreur fatale est un fait, pas un hoquet : elle compte tout de suite.
echecs=$((echecs + 1))
if printf '%s\n' "${problemes[@]}" | grep -q 'erreur(s) fatale'; then
  echecs=$((echecs > 2 ? echecs : 2))
fi
ecrire echecs_de_suite "$echecs"
[ "$echecs" -lt 2 ] && exit 0
[ "$etat" = PANNE ] && exit 0     # déjà signalée : on ne répète pas chaque minute

details=$(printf '%s ; ' "${problemes[@]}")
details=${details% ; }

if [ "$api_tombee" = 1 ] && [ -r "$ETAT/api-saine.php" ] && [ -w "$PROD_API" ]; then
  modif=$(stat -c %Y "$PROD_API")
  if [ $((maintenant - modif)) -lt $((RETOUR_MINUTES * 60)) ] \
     && ! cmp -s "$PROD_API" "$ETAT/api-saine.php"; then
    if [ "$ESSAI" = 1 ]; then
      echo "ESSAI — remettrait la dernière version saine de l'API"
    else
      cp "$PROD_API" "$ETAT/api-fautive.php"
      # cat > et non cp : le fichier de production garde son propriétaire.
      cat "$ETAT/api-saine.php" > "$PROD_API"
    fi
    details="$details. Mise en ligne de moins de $RETOUR_MINUTES min : la version précédente a été remise (fautive gardée dans $ETAT/api-fautive.php)"
  fi
fi

ecrire etat PANNE
prevenir "Panne : $details. Cherche la cause, corrige si c'est sans risque, et préviens Charles par notification."
