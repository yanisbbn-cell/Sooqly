# Sooqly – règles du projet

Sooqly est une marketplace mobile et web (Android, iPhone, site) pour acheter, vendre, louer et donner dans les 69 wilayas d’Algérie, dans le respect de la législation islamique.

Références, à lire avant toute étape :
- `docs/cahier-des-charges.md` : ce qu’il faut construire. C’est la règle.
- `docs/maquette-sooqly.html` : la maquette interactive validée, référence visuelle de chaque écran (textes, ordre, couleurs, comportements). En cas de doute entre les deux, demander à Yanis.
- `docs/plan-de-construction.md` : l’ordre des étapes (0 à 15).

## Avec qui tu travailles

Yanis n’est pas développeur. Il travaille uniquement depuis le navigateur d’une tablette Android (Xiaomi Pad 7), sans ordinateur, et teste l’application sur son iPhone avec Expo Go (QR code scanné avec l’appareil photo de l’iPhone). Il parle français.

- Réponds en français, avec des mots simples ; explique tout terme technique en une phrase.
- Une seule étape du plan à la fois. Avant d’agir : explique ce que tu vas faire et ce que Yanis devra faire de son côté, puis attends son accord.
- Quand Yanis doit agir (créer un compte, copier une clé, tester), donne des instructions numérotées, avec le lien exact et le nom exact des boutons. Une action par ligne. Attends « c’est fait » avant la suite.
- Ne commence jamais l’étape suivante sans qu’il le demande.
- À la fin de chaque étape : ce qui a été fait, comment le tester sur Expo Go, ce qui reste.

## Principes non négociables

- Rien de contraire à la législation islamique : pas de riba, pas de gharar, pas de biens ou services illicites, pas d’enchères, jamais.
- Aucune photo d’être animé (personnes, animaux) dans les annonces ni dans les profils. Profils : 40 illustrations sans visage, jamais de photo.
- Prix en dinars entiers (« 45 000 DA »), jamais de centimes ni de « millions ». Prix ferme ou légèrement négociable, au choix du vendeur.
- Sooqly ne touche jamais l’argent des transactions et ne tranche aucun litige.
- Coordonnées privées : échanges par la messagerie interne uniquement.
- Le badge « Vendeur validé » ne change jamais l’ordre des annonces ; seules les annonces sponsorisées (pros) passent devant, toujours signalées « Sponsorisé ».

## Langues

- Français et arabe dès la première version, bascule d’un clic, droite à gauche complet en arabe.
- Aucun texte écrit en dur dans les écrans : tout passe par i18next (`fr` et `ar`).
- Chiffres occidentaux ; mois algériens en arabe (جانفي، فيفري…).

## Design

- Fond blanc. Structure : brun #3B2D22 (en-têtes, textes), sables #F4E9D8, #E6D2B6, #C9AE8B, #9C7C5D, cartes #F6F0E6.
- Règle des couleurs : accent (terre cuite #C4512E, petits textes #A9421F) = agir ; vert #2F7A4B = confiance (Vendeur validé, En ligne, vérifié, conseils) ; rouge #B5453F = danger (arnaque, blocage, suppression).
- Les couleurs vivent dans un seul fichier de thème : l’accent n’est pas encore définitif.
- Polices : Space Grotesk (titres, logo), Inter (texte), IBM Plex Sans Arabic (arabe), Amiri (Coran et hadiths).
- Logo : « Sooq » + « ly » en couleur d’accent.
- Contraste minimum 4,5 pour 1 ; zones tactiles d’au moins 44 px.

## Pile technique

- Expo (React Native) + Expo Router, TypeScript strict.
- Supabase : PostgreSQL, Auth (téléphone par SMS), Storage, Realtime, Edge Functions.
- EAS Build et EAS Submit pour les magasins ; web Expo hébergé sur Vercel.
- Règles RLS sur toutes les tables, sans exception.
- Aucune clé secrète dans le code ni dans Git : variables d’environnement, et dis à Yanis où les ranger.

## Habitudes de code

- Petits commits clairs, en français.
- Tester ce qui est testable avant de dire qu’une étape est finie.
- Ne pas ajouter de fonction absente du cahier des charges sans demander.
