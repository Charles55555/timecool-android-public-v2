# Sert l API du depot en local sur le serveur (php -S), avec une configuration PROPRE a claudecode
# (ses identifiants MySQL, un poivre a lui) : meme base, comptes e2e jetables comme d habitude.
# Seules les e2e qui creent leurs propres comptes sont valables ici (un autre poivre ne retrouve
# pas les comptes fixes de production).
# Usage : bash api-locale.sh demarrer|arreter|etat|e2e
cd ~/repos/timecool-android || exit 1
PHP=/opt/plesk/php/8.3/bin/php
PORT=8099
PIDF=~/api-locale.pid
PRIV=~/api-locale/private
case "${1:-etat}" in
  demarrer)
    if [ ! -f $PRIV/config.php ]; then
      mkdir -p $PRIV && chmod 700 ~/api-locale $PRIV
      U=$(awk -F= '/^[[:space:]]*user[[:space:]]*=/{gsub(/[[:space:]"'"'"']/,"",$2);print $2;exit}' ~/.my.cnf)
      P=$(awk -F= '/^[[:space:]]*password[[:space:]]*=/{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$2);gsub(/^["'"'"']|["'"'"']$/,"",$2);print $2;exit}' ~/.my.cnf)
      H=$(awk -F= '/^[[:space:]]*host[[:space:]]*=/{gsub(/[[:space:]]/,"",$2);print $2;exit}' ~/.my.cnf)
      [ -z "$U" ] && U=claudecode
      [ -z "$H" ] && H=localhost
      {
        echo "<?php"
        echo "// Configuration LOCALE de claudecode pour php -S (jamais en production). Generee par api-locale.sh."
        echo "return ["
        echo "    'db' => ['hote' => '$H', 'base' => 'timecool_prod', 'utilisateur' => '$U', 'mot_de_passe' => '$P'],"
        echo "    'poivre' => '$(openssl rand -hex 32)',"
        echo "    'cle_chiffrement' => '$(openssl rand -hex 32)',"
        echo "    'google_client_ids' => [],"
        echo "    'twilio_account_sid' => 'A_RENSEIGNER', 'twilio_auth_token' => 'A_RENSEIGNER', 'twilio_numero_expediteur' => 'A_RENSEIGNER',"
        echo "    'session_jours' => 30, 'lien_rdv_heures' => 48, 'appairage_minutes' => 10,"
        echo "    'verification_obligatoire' => false, 'verification_minutes' => 15, 'verification_max_par_heure' => 5,"
        echo "    'mode_test' => true,"
        echo "    'email_expediteur' => 'contact@timecool.fr', 'email_mot_de_passe' => '',"
        echo "    'url_publique' => 'http://127.0.0.1:$PORT',"
        echo "    'origines_autorisees' => ['null', 'https://timecool.fr', 'https://app.timecool.fr'],"
        echo "];"
      } > $PRIV/config.php
      chmod 600 $PRIV/config.php
      echo "config locale ecrite ($U@$H)"
    fi
    $PHP -l $PRIV/config.php > /dev/null || { echo "config locale invalide"; exit 2; }
    if [ ! -e backend/private ]; then ln -s $PRIV backend/private; echo "lien backend/private -> $PRIV"; fi
    grep -qx "backend/private" .gitignore 2>/dev/null || grep -qx "backend/private/" .gitignore 2>/dev/null || { echo "backend/private" >> .gitignore; echo ".gitignore : backend/private ajoute"; }
    git check-ignore -q backend/private && echo "backend/private ignore par git" || { echo "ATTENTION : backend/private PAS ignore"; }
    if [ -f $PIDF ] && kill -0 "$(cat $PIDF)" 2>/dev/null; then echo "deja en route (pid $(cat $PIDF))"; exit 0; fi
    nohup $PHP -S 127.0.0.1:$PORT backend/api/index.php > ~/api-locale.log 2>&1 &
    echo $! > $PIDF
    sleep 1
    echo "fumee : HTTP $(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' http://127.0.0.1:$PORT/connexion -d '{}')  (attendu 400/401, pas 500)"
    curl -s -X POST -H 'Content-Type: application/json' http://127.0.0.1:$PORT/connexion -d '{}' | head -c 300; echo
    tail -3 ~/api-locale.log
    ;;
  arreter)
    [ -f $PIDF ] && kill "$(cat $PIDF)" 2>/dev/null; rm -f $PIDF; echo "arretee"
    ;;
  etat)
    [ -f $PIDF ] && kill -0 "$(cat $PIDF)" 2>/dev/null && echo "en route (pid $(cat $PIDF))" || echo "arretee"
    ;;
  e2e)
    # Les e2e a comptes jetables, une par une, jamais en meme temps que quelqu un d autre.
    rouge=0
    for s in verif-rdv-e2e verif-validation-rdv-e2e verif-blocage-silence-e2e verif-temps-protege-e2e verif-qui-ecrit-e2e verif-type-rdv-e2e verif-sync-e2e verif-suppression-e2e e2e-rdv-groupe; do
      TC_API=http://127.0.0.1:$PORT node scripts/verifications/$s.js > ~/e2e-locale-$s.log 2>&1
      c=$?
      [ $c -eq 0 ] || rouge=1
      printf '%-32s code %s  %s\n' "$s" "$c" "$(grep -E "anomalie" ~/e2e-locale-$s.log | tail -1)"
      [ $c -eq 0 ] || grep -E "^\s+KO |Error|error" ~/e2e-locale-$s.log | head -6
    done
    echo "ROUGE=$rouge"
    ;;
esac
