#!/usr/bin/env bash
# Mission 117 : un Chrome sans tête sur le serveur, dans le dossier de l'utilisateur (sans root, sans apt install),
# pour que verifier.sh rejoue pour de bon les suites qui ont besoin d'un navigateur (phrases de Charles et les autres).
# Rejouable : ne refait que ce qui manque. Résultat : ~/outils-tc/chrome (lanceur), lu par verifier.sh.
set -e
O="$HOME/outils-tc"
mkdir -p "$O/debs" "$O/libs"
cd "$O"
if ! find "$O/chrome-headless-shell" -name chrome-headless-shell -type f 2>/dev/null | grep -q .; then
  npx -y @puppeteer/browsers@3.2.7 install chrome-headless-shell@stable --path "$O"
fi
# Les bibliothèques qui manquent au serveur, prises dans les paquets Ubuntu et dépliées ici (sans les installer).
cd "$O/debs"
for p in libatk1.0-0 libatk-bridge2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 \
         libatspi2.0-0 libwayland-server0 libxshmfence1 libxi6 libxtst6 libxcb-randr0; do
  ls "$p"_*.deb >/dev/null 2>&1 || apt-get download "$p"
done
for d in *.deb; do dpkg -x "$d" "$O/libs"; done
EXE=$(find "$O/chrome-headless-shell" -name chrome-headless-shell -type f | sort | tail -1)
LIBS=$(find "$O/libs" -name '*.so*' -printf '%h\n' | sort -u | tr '\n' ':')
cat > "$O/chrome" <<FIN
#!/usr/bin/env bash
export LD_LIBRARY_PATH="$LIBS\${LD_LIBRARY_PATH:-}"
exec "$EXE" --no-sandbox "\$@"
FIN
chmod +x "$O/chrome"
echo '<p id="x">pret</p>' > "$O/essai.html"
if "$O/chrome" --headless=new --disable-gpu --dump-dom "file://$O/essai.html" 2>/dev/null | grep -q pret; then
  echo "Chrome du serveur : prêt ($O/chrome)"
else
  echo "Chrome du serveur : ne démarre pas" >&2; exit 1
fi
