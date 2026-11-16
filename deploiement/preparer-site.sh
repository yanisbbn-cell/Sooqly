#!/usr/bin/env bash
# Prépare la version web exportée (dossier passé en argument, par défaut dist) pour Vercel.
# Vercel n'envoie jamais les dossiers « node_modules » : Expo y range les polices et quelques images.
# On renomme donc ce dossier et on met à jour les adresses qui y mènent.
set -euo pipefail
DOSSIER="${1:-dist}"
if [ -d "$DOSSIER/assets/node_modules" ]; then
  mv "$DOSSIER/assets/node_modules" "$DOSSIER/assets/modules"
  grep -rlF "assets/node_modules/" "$DOSSIER" --include='*.js' --include='*.html' --include='*.json' --include='*.css' \
    | xargs -r sed -i 's#assets/node_modules/#assets/modules/#g'
fi
cp "$(dirname "$0")/vercel.json" "$DOSSIER/vercel.json"
echo "Site prêt dans $DOSSIER"
