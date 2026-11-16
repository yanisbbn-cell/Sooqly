# Mise en ligne du site web (Vercel)

Le site est la version web d'Expo, hébergée sur Vercel (projet `sooqly`, espace SSI).

1. `npx expo export --platform web --output-dir dist`
2. `deploiement/preparer-site.sh dist` (renomme le dossier des polices, que Vercel ignorerait, et ajoute `vercel.json` : retour vers l'appli pour toutes les adresses, en-têtes de sécurité)
3. `npx vercel deploy dist --prod` (avec la clé Vercel, jamais écrite dans le dépôt)

La mise en ligne automatique à chaque modification sera branchée à l'étape 15.
