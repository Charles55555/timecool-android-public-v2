#!/bin/bash
#
# Veille hebdomadaire du serveur TimeCool — le lundi à 7h (cron de
# claudecode). Ne répare rien elle-même : elle dresse l'état et réveille
# la session Claude du serveur avec un message [VEILLE HEBDO], qui
# corrige ce qu'elle peut et ne prévient Charles que si c'est utile.
#
# Sans droits root : ce qu'elle ne peut pas lire (sauvegardes Plesk,
# file des e-mails) est vérifié par la session à son réveil, ou confié
# à la session du PC.
#
# Essai sans réveiller personne :  VEILLE_ESSAI=1 bash scripts/veille-hebdo.sh

set -u
SESSION=${VEILLE_SESSION:-timecool}
EMAIL=${VEILLE_EMAIL:-5@dentalcortex.fr}
ESSAI=${VEILLE_ESSAI:-0}

points=()
alertes=0
noter() { points+=("$1"); }
alerter() { points+=("⚠ $1"); alertes=$((alertes + 1)); }

# Disque
pct=$(df --output=pcent / | tail -1 | tr -dc 0-9)
if [ "$pct" -ge 85 ]; then alerter "disque plein à ${pct} %"; else noter "disque ${pct} %"; fi

# Certificats, vus depuis le serveur (jamais depuis le PC : Norton les réécrit)
for h in timecool.fr api.timecool.fr; do
  fin=$(echo | timeout 10 openssl s_client -connect "$h:443" -servername "$h" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$fin" ]; then alerter "certificat de $h illisible"; continue; fi
  jours=$(( ($(date -d "$fin" +%s) - $(date +%s)) / 86400 ))
  if [ "$jours" -lt 20 ]; then alerter "certificat de $h expire dans $jours jours"; else noter "certificat $h : $jours jours"; fi
done

# SSH : une seule adresse qui tient beaucoup de connexions (épuisement du
# port 22 le 03/10/2026, 212.112.98.73). Au-delà de 5, on le signale.
max_ip=$(ss -tn '( sport = :22 )' 2>/dev/null | awk 'NR>1 && $1 !~ /^(FIN-WAIT|TIME-WAIT|CLOSE|LAST-ACK|CLOSING)/ {n=split($5,a,":"); ip=a[1]; for(i=2;i<n;i++) ip=ip":"a[i]; print ip}' | sort | uniq -c | sort -rn | head -1)
nb=$(echo "$max_ip" | awk '{print $1+0}')
if [ "${nb:-0}" -gt 5 ]; then alerter "SSH : $nb connexions depuis $(echo "$max_ip" | awk '{print $2}')"; else noter "SSH : ${nb:-0} connexion(s) max par adresse"; fi

# Mises à jour et redémarrage
maj=$(apt list --upgradable 2>/dev/null | grep -c upgradable)
noter "$maj mise(s) à jour système en attente"
if [ -e /var/run/reboot-required ]; then
  depuis=$(( ($(date +%s) - $(stat -c %Y /var/run/reboot-required)) / 86400 ))
  if [ "$depuis" -ge 8 ]; then alerter "redémarrage demandé depuis $depuis jours"; else noter "redémarrage demandé depuis $depuis jour(s)"; fi
fi
noter "Plesk $(cut -d' ' -f1 /usr/local/psa/version 2>/dev/null)"

# Santé de TimeCool sur la semaine, d'après la sentinelle
pannes=$(grep -c 'Panne' "$HOME/.timecool-sentinelle/historique.log" 2>/dev/null || echo 0)
noter "pannes signalées par la sentinelle (total) : $pannes"

resume=$(printf '%s ; ' "${points[@]}"); resume=${resume% ; }
message="[VEILLE HEBDO $(TZ=Europe/Paris date '+%d/%m')] $alertes alerte(s) : $resume. Vérifie aussi la copie IONOS de la semaine et la file des e-mails (via la session du PC), corrige ce qui peut l'être, et ne préviens Charles par notification que s'il y a quelque chose d'important."

if [ "$ESSAI" = 1 ]; then echo "$message"; exit 0; fi
if tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux send-keys -t "$SESSION" -l "$message"
  tmux send-keys -t "$SESSION" Enter
elif [ "$alertes" -gt 0 ]; then
  printf '%s\n' "$message" | mail -s "PANNE APPLICATION TIMECOOL SUR LE SERVEUR — veille hebdomadaire" "$EMAIL"
fi
