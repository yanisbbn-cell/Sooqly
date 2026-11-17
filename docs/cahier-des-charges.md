# Sooqly – Cahier des charges

Version du 15 novembre 2026. La version de travail vivante est le document Claude « Sooqly – Cahier des charges et plan de construction » ; ce fichier en est la copie de référence pour le code.

## 1. Présentation et principes

Sooqly est une marketplace mobile et web pour acheter, vendre, louer et donner dans les 69 wilayas d’Algérie, dans le respect de la législation islamique. Slogan : « Tout se trouve près de chez vous. » La maquette interactive (`docs/maquette-sooqly.html`) est la référence visuelle et fonctionnelle de chaque écran : en cas de doute, c’est elle qui fait foi.

Principes non négociables, appliqués dans chaque fonctionnalité :

- Rien de contraire à la législation islamique : pas de riba, pas de gharar, pas de biens ou services illicites, pas d’enchères.
- Aucune photo d’être animé dans les annonces ni dans les profils : détecteur, puis modération humaine.
- Prix en dinars entiers, jamais en centimes ni en « millions ». Le vendeur indique « Prix ferme » ou « Légèrement négociable » ; le marchandage à l’amiable est permis, les enchères jamais.
- Sooqly est un intermédiaire : il n’est partie à aucun contrat, ne détient jamais l’argent des transactions (y compris en paiement à la livraison) et ne tranche aucun litige ; il renvoie vers les autorités compétentes.
- Coordonnées privées : les échanges passent par la messagerie interne.
- Cours particuliers entre personnes du même sexe (décision du 17 novembre 2026, voir « Règles métier »).

Identité visuelle :

| Élément | Choix |
| --- | --- |
| Logo dans l’application | « Sooqly » en Space Grotesk gras, « ly » en couleur d’accent |
| Icône d’écran d’accueil | « Sooq » au-dessus de « Ly » dessiné en carré ; à finaliser avec Yanis |
| Fond | Blanc |
| Structure | Brun #3B2D22 (en-têtes, textes), sables #F4E9D8, #E6D2B6, #C9AE8B, #9C7C5D, cartes #F6F0E6 |
| Accent = agir | Terre cuite #C4512E (choix provisoire, variantes Safran #E26B12 et Braise #D9480F), version foncée #A9421F pour les petits textes |
| Vert = confiance | #2F7A4B : Vendeur validé, En ligne, Téléphone vérifié, conseils, alertes actives |
| Rouge = danger | #B5453F : arnaque, blocage, suppression |
| Polices | Space Grotesk (titres), Inter (texte), IBM Plex Sans Arabic (arabe), Amiri (Coran et hadiths) |
| Mode sombre | À définir une fois l’accent choisi |

Tout texte respecte un contraste d’au moins 4,5 pour 1 avec son fond (3 pour 1 pour les textes de 19 px gras et plus).

## 2. Plateformes, langues et choix techniques

Une seule base de code pour Android, iPhone et le site web, pilotable entièrement depuis une tablette, sans ordinateur.

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Application | Expo (React Native) avec Expo Router, en TypeScript | Un seul code pour Android, iOS et le web |
| Serveur et données | Supabase : base PostgreSQL, comptes, stockage des photos, messagerie en temps réel | Tout se gère depuis un navigateur |
| Compilation des applis | EAS Build, dans le cloud d’Expo | Compile l’appli iPhone sans Mac |
| Publication | EAS Submit vers Google Play et l’App Store | Envoi aux magasins sans ordinateur |
| Site web | Version web d’Expo, hébergée sur Vercel | Mise en ligne automatique à chaque modification |
| Code source | Dépôt GitHub privé | Claude Code travaille directement dessus |
| Développement | Claude Code dans le navigateur de la tablette | Écrit, teste et corrige le code dans le cloud |

Langues : français et arabe dès la version 1, bascule d’un clic, mise en page de droite à gauche complète en arabe. Tous les textes passent par des fichiers de traduction (i18next), aucun texte écrit en dur dans les écrans. La langue choisie est mémorisée sur l’appareil. Mois algériens en arabe (جانفي، فيفري…), chiffres occidentaux, 69 wilayas numérotées en français et en arabe.

Devise : dinar algérien (DA / دج), équivalent en euros affiché à titre indicatif, avec un taux réglable par l’administrateur.

## 3. Rôles des utilisateurs

| Rôle | Peut faire | Ne peut pas faire |
| --- | --- | --- |
| Visiteur (non connecté) | Parcourir, rechercher, filtrer, trier, lire la charte, voir la présentation | Publier, écrire, mettre en favori, créer une alerte, noter, signaler |
| Membre particulier | Tout ce que fait le visiteur, plus publier, contacter, louer, envoyer son permis, noter, gérer ses annonces, créer des alertes, signaler, bloquer, parrainer | Publier une annonce professionnelle, payer une mise en avant |
| Membre professionnel | Comme le particulier, avec la mention PRO, une page vitrine et l’accès à la mise en avant payante | Se faire passer pour un particulier |
| Modérateur | Valider ou refuser annonces et photos, traiter les signalements, suspendre un compte | Trancher un litige entre membres |
| Administrateur | Tout gérer : taux de change affiché, seuil du badge, catégories, mots interdits, tarifs de mise en avant, texte de la charte | — |

Inscription, en un seul écran :

1. Nom et prénom, ou kounia (au choix).
2. Wilaya, choisie dans la liste des 69 avec un champ de recherche, puis ville.
3. Numéro de téléphone mobile : obligatoire pour créer le compte. Pays acceptés : Algérie (+213), France (+33), Belgique (+32), Espagne (+34), Allemagne (+49), Italie (+39). Décision du 15 novembre 2026 : pas de vérification par SMS pour l’instant (les SMS sont payants) ; elle pourra être activée plus tard sans refaire l’inscription.
4. Homme ou femme (obligatoire, privé : jamais affiché ; sert seulement à la règle des cours particuliers ; modifiable uniquement par la modération). Les membres inscrits avant cette règle répondent une fois, à leur prochaine ouverture de l’application.
5. Mot de passe.
6. Case obligatoire « J’ai lu la charte et je m’engage à la respecter, et à craindre Allah dans mes transactions ».

Image de profil : choisie parmi 40 illustrations sans visage (20 « Hommes », 20 « Femmes »), jamais une photo. Le membre reste connecté sur son appareil jusqu’à ce qu’il se déconnecte lui-même ; la déconnexion demande une confirmation. Une option « Se déconnecter de tous mes appareils » est prévue dans les réglages.

## 4. Écrans et fonctionnalités

Navigation du bas, toujours visible sur les écrans principaux : Annonces, Messages, **Publier** (au centre, bouton d’accent intégré à la barre, sans dépasser), Favoris, Compte. Chaque écran existe en français et en arabe.

1. **Accueil au premier lancement.** Trois écrans avec points de progression et bouton « Passer » : le concept (« Tout se trouve près de chez vous », 69 wilayas), les principes (pas de riba ni d’enchères, pas de photos d’êtres animés, licite uniquement, prix clairs en dinars, verset An-Nisâ’ 29), la confiance (téléphone vérifié, notes, badge). Fin : « Créer mon compte » ou « Découvrir sans compte ». Affiché une seule fois par appareil, revisible depuis le Compte.
2. **Annonces (accueil).** Logo, bouton de langue, barre de recherche fine avec loupe intégrée (Entrée du clavier ou loupe pour lancer, une seule croix pour effacer), bouton Filtres avec compteur. Rangée de catégories ; un appui ouvre une feuille de sous-catégories à choix multiples. Rangée contextuelle « À la une » (annonces pros payées) ; annonce sponsorisée insérée toutes les 6 annonces. Pendant une recherche : résumé et bouton « Créer une alerte pour cette recherche ». Tri : Plus récentes, Prix croissant, Prix décroissant, Près de chez moi (décision du 17 novembre 2026 : d’abord la wilaya de référence, puis les autres de la plus proche à la plus lointaine selon la distance entre chefs-lieux ; sans localisation du téléphone ; wilaya de référence = celle du profil, modifiable sur l’appareil par « Changer » ; un visiteur sans compte la choisit). Carte d’annonce : photo, prix, état, ville, badge vert « Vendeur validé », mention verte de livraison (« Livraison 69 wilayas » ou « Livraison <ville> »). Les annonces sponsorisées passent en tête ; le badge ne change jamais l’ordre.
3. **Filtres.** Wilaya (69, avec recherche), prix minimum et maximum, type (Vente, Location, Service, Don), état (5 niveaux), annonceur (Particuliers, Professionnels), « Vendeurs validés uniquement », « Livrable chez moi », puis les critères propres à la catégorie façon Leboncoin (carburant, boîte, portes, kilométrage, année, surface, pièces, meublé, matière, taille, etc.). Bouton « Voir N annonces ».
4. **Recherche de location (façon Booking).** Onglets Logement / Véhicule, wilaya, durée (dates précises, 1 mois, 6 mois, 1 an), calendrier de dates. Logement : type (Studio, F2, F3, F4 et plus, Maison) et personnes. Véhicule : type, boîte, places. Budget maximum facultatif.
5. **Résultats de location.** Résumé, Modifier, tri par prix, **total pour toute la période** et équivalent en euros.
6. **Fiche annonce.** Jusqu’à 10 photos, pastilles (type, Professionnel, Prix ferme ou Légèrement négociable, Échange possible, Sponsorisé), titre, prix et unité, état, caractéristiques, wilaya, description. Bloc « Remise et livraison » (main propre, livraison par le vendeur dans sa wilaya, envoi partout en Algérie avec paiement à la réception). Location : calendrier et total. Véhicule en location : bloc « Permis de conduire ». Carte du vendeur (note, badge, Téléphone vérifié). Bouton « Contacter le vendeur », favori, lien « Signaler l’annonce ».
7. **Profil du vendeur.** Note moyenne, avis, ventes notées 5 étoiles, progression vers le badge, notes par critère, ses annonces, boutons « Signaler ce membre » et « Bloquer ».
8. **Page vitrine d’un professionnel.** Bannière, nom commercial, activité, wilaya, note, toutes ses annonces ; réservée aux pros abonnés.
9. **Contacter le vendeur.** Rappel de l’annonce, messages rapides, message pré-rempli, rappel « vos coordonnées restent privées », mise en garde si le texte parle d’avance ou d’acompte.
10. **Messages et discussion.** Une discussion par annonce. Encadré vert « Restez prudent » à l’ouverture. Réponses rapides au-dessus du clavier. Bouton micro quand le champ est vide (message vocal), bouton d’envoi sinon. Bouton 📍 pour proposer un lieu de rendez-vous public (carte dans la bulle, « Ouvrir dans Maps »). Pièce jointe « permis » en location de véhicule. Menu ⋮ : Signaler ce membre, Bloquer (avec confirmation). Mise en garde rouge si un message parle d’avance, CCP, BaridiMob, flexy, عربون…
11. **Publier (assistant en 5 étapes).** Barre de progression, conseil vert à chaque étape, jauge de qualité. (1) Particulier ou Professionnel, catégorie et sous-catégorie. (2) Titre, description, caractéristiques. (3) État (Neuf à Mauvais état). (4) Photos : jusqu’à 10, avec angles suggérés et lien vers le guide photo. (5) Prix en DA avec rappel « 1 000 DA = un billet de 1 000 DA ≈ 3,70 € », Prix ferme ou Légèrement négociable, « J’accepte un échange », Remise et livraison, unité et disponibilités en location, « Exiger le permis », wilaya ; puis récapitulatif et « Envoyer pour vérification ». Un prix incohérent (voiture à 42 DA) bloque l’étape suivante. Les dons sont gratuits.
12. **Guide photo.** Exemple accepté et refusé, règles : l’objet seul, reflets, lumière du jour, fond neutre, plusieurs angles, logements et véhicules.
13. **Favoris.** Annonces enregistrées, chacune avec « Prévenez-moi si le prix baisse » ; une baisse affiche l’ancien prix barré et le pourcentage.
14. **Compte.** Connexion ou inscription. Connecté : tableau de bord façon Leboncoin (image de profil, « À faire », mes annonces en cours, mes alertes de recherche, favoris), carte « Invitez vos proches », menu (Documents reçus, Notre charte, Revoir la présentation, Langue, Déconnexion).
15. **Mes alertes de recherche.** Aperçu de notification, pour chaque alerte : résumé lisible, nouvelles annonces, notifications activées ou coupées, Voir les annonces, Supprimer.
16. **Mes annonces.** Bilan (en ligne, réservées, vendues, expirées). Par annonce : vues, favoris, messages, graphique des vues sur 7 jours, conseil si beaucoup de vues et peu de messages, « Expire dans X jours ». Actions : Réservé / Remettre en vente, Vendu ou Loué (choix de l’acheteur puis notation), Modifier, Supprimer avec confirmation, Republier gratuitement une annonce expirée.
17. **Documents reçus.** Permis envoyés par les locataires, Accepter / Refuser, visibles par le seul destinataire.
18. **Notation rapide.** Après chaque transaction, pour les deux parties : étoiles, trois critères pré-remplis ajustables, envoi. Deux gestes suffisent.
19. **Signaler.** Feuille avec motifs (annonce : contraire à la charte, photo d’être animé, arnaque, doublon, mauvaise catégorie, autre ; membre : arnaque, propos déplacés, faux profil, contraire à la charte, autre), précisions facultatives, envoi anonyme, confirmation « examen sous 24 h » et proposition de bloquer.
20. **Notre charte.** Basmala, préambule, 13 articles dépliables avec preuves du Coran et de la Sunna, texte identique à la maquette.

## 5. Règles métier

**Catégories.** Immobilier, Véhicules, Pièces auto, Électroménager, Ameublement, Informatique & téléphonie, Vêtements, Bébé et enfants (ancien nom « Famille », renommée le 17 novembre 2026 ; icône : une poussette, jamais un enfant dessiné), Services, Dons. Chacune a ses sous-catégories (liste de la maquette) et ses critères de recherche. État de l’objet sur 5 niveaux : Neuf, Très bon état, Bon état, État correct, Mauvais état. Critère des services « Proposé par » : Une personne, Une équipe.

**Cours particuliers (décision du 17 novembre 2026)**

- Concerne la sous-catégorie « Cours et soutien scolaire » (d’autres sous-catégories pourront être ajoutées par réglage).
- À la publication, le professeur choisit le public : « Enfants (primaire, collège) » ou « Lycée et adultes ».
- Enfants : annonce visible par tous, tous les parents (pères comme mères) peuvent contacter.
- Lycée et adultes : annonce visible et contactable uniquement par les membres du même sexe que le professeur. Les visiteurs sans compte et les membres qui n’ont pas encore indiqué homme ou femme ne la voient pas.
- L’annonce affiche « Cours donnés par un homme / une femme · Enfants / Pour les hommes / Pour les femmes ».
- Règle appliquée par la base (liste, fiche, photos, contact, alertes de recherche), pas seulement par l’écran.

**Détecteur de conformité (à la publication)**

- Analyse du titre et de la description pendant la saisie, en français et en arabe. Normalisation : sans accents, sans harakât, hamza ramenée à alif.
- Mots interdits par famille (musique et instruments, tabac et chicha, alcool et non halal, crédit et intérêt, enchères et loterie, représentations d’êtres animés), modifiables par l’administrateur sans toucher au code.
- Un particulier qui écrit « agence », « garage », « concession » ou leurs équivalents arabes est invité à passer en Professionnel.
- Photos : détection des visages, personnes et animaux ; une photo suspecte est refusée. Toute annonce passe ensuite en modération humaine.
- Prix incohérent pour la catégorie (fourchettes réglables) : étape suivante bloquée avec explication.

**Prix**

- Chiffres uniquement, en dinars, affichés avec espaces (45 000 DA), rappel « 1 000 DA = un billet de 1 000 DA ≈ 3,70 € ». Équivalent en euros indicatif, taux réglé par l’administrateur.
- Prix ferme ou légèrement négociable, au choix du vendeur ; jamais d’enchères ni de majoration pour paiement échelonné. Les dons sont gratuits.

**Remise et livraison**

- Pour les objets (hors immobilier, véhicules, services et locations) : remise en main propre, livraison par le vendeur dans sa wilaya, envoi partout en Algérie par société de livraison avec paiement à la réception. Plusieurs choix possibles.
- Sooqly ne touche jamais l’argent : la société de livraison encaisse et reverse au vendeur selon ses propres conditions. Frais à la charge de l’acheteur, selon la wilaya. Un encart « Comment je reçois mon argent ? » l’explique au vendeur.
- Filtre « Livrable chez moi » : envoi partout, ou vendeur qui livre dans la wilaya du membre.

**Location**

- Unités : logement → nuit, semaine, mois, 6 mois, an ; véhicule → jour, semaine, mois, 6 mois, an. Plusieurs tarifs possibles par annonce.
- Courte durée : total = unités × prix (nuits = jours d’écart ; jours = écart + 1 ; semaines et mois arrondis au-dessus). Longue durée : tarif de la durée, sinon mensuel × mois ; sans tarif adapté, l’annonce n’apparaît pas.
- Seuls les biens disponibles aux dates demandées apparaissent, d’après le calendrier du loueur.
- Permis de conduire : exigible par le loueur, téléversé par le locataire, visible par le seul destinataire, effacé à la fin de la location, accepté ou refusé dans « Documents reçus ».

**Vie d’une annonce**

- Statuts : En vérification → En ligne (vert) → Réservé (reste visible avec la mention) → Vendu ou Loué. Refusée avec motif si non conforme.
- Expiration automatique après 60 jours en ligne ; rappel à 7 jours ; republication gratuite pour 60 jours.
- « Vendu » ou « Loué » demande à qui (membres ayant écrit, ou « hors de Sooqly ») ; avec un membre, la notation s’ouvre pour les deux parties.

**Alertes**

- Alerte de recherche : enregistre la recherche et ses filtres ; une notification part à chaque nouvelle annonce validée qui correspond. Notifications coupables par alerte.
- Alerte de prix sur un favori : notification dès que le vendeur baisse son prix.

**Notation et badge**

- Après une transaction, acheteur et vendeur se notent : l’acheteur sur conformité, ponctualité, comportement ; le vendeur sur ponctualité, paiement comme convenu, comportement. Une note par partie, non modifiable après 48 heures.
- Badge vert « Vendeur validé » à partir de 10 ventes notées 5 étoiles (seuil réglable). C’est un signe de confiance : il ne change jamais l’ordre des annonces.

**Confiance et sécurité des échanges**

- Signalement anonyme d’une annonce ou d’un membre, examiné sous 24 heures.
- Blocage : le membre bloqué ne peut plus écrire ni contacter les annonces de celui qui l’a bloqué ; il n’en est pas averti ; déblocage à tout moment.
- Conseils anti-arnaque à l’ouverture de chaque discussion ; mise en garde automatique sur les mots d’avance de paiement.

**Professionnels et mise en avant**

- Agences, garages et loueurs se déclarent professionnels : activité et nom commercial, sans registre du commerce.
- Mise en avant réservée aux pros, à prix fixe annoncé d’avance, toujours signée « Sponsorisé » : rangée « À la une », annonce insérée dans le fil, page vitrine. Jamais de bandeau défilant automatique. Activée à la main par l’administrateur en version 1.

**Parrainage**

- Chaque membre a un code et un lien d’invitation ; le compteur affiche les personnes inscrites grâce à lui. Aucune récompense en argent.

**Charte**

- Les 13 articles de la maquette, stockés en base en français et en arabe, modifiables sans nouvelle version de l’application. Toute mise à jour notifie les membres.

## 6. Modèle de données

Tables principales dans Supabase. Claude Code les précisera ; cette liste fixe ce qui doit exister.

| Table | Contenu principal |
| --- | --- |
| profiles | nom affiché (nom-prénom ou kounia), sexe (privé), wilaya, ville, téléphone vérifié, image de profil (n° d’illustration), langue, statut pro, activité, nom commercial, charte acceptée (date, version), code de parrainage, parrain |
| listings | auteur, type (vente, location, service, don), catégorie, sous-catégorie, titre, description, état, caractéristiques (format libre par catégorie), prix en DA, prix ferme ou négociable, échange accepté, modes de remise (main propre, livraison wilaya, envoi), wilaya (01 à 69), ville, statut (vérification, en ligne, réservé, vendu, loué, expiré, refusé), date d’expiration, acheteur final, sponsorisé jusqu’au, permis exigé, public du cours et sexe du professeur (cours particuliers) |
| listing_rates | annonce, unité (nuit, jour, semaine, mois, 6 mois, an), prix en DA |
| listing_photos | annonce, fichier, ordre (1 à 10), angle, résultat du détecteur, décision de modération |
| listing_prices | annonce, ancien prix, nouveau prix, date (déclenche les alertes de prix) |
| listing_stats | annonce, jour, vues, favoris, messages |
| availability | annonce, date de début, date de fin |
| conversations | annonce, acheteur, vendeur, date du dernier message |
| messages | discussion, auteur, type (texte, vocal, lieu, permis), contenu ou fichier, durée (vocal), lieu (nom, coordonnées), lu ou non |
| private_documents | expéditeur, destinataire, annonce, fichier, statut, date d’effacement |
| transactions | annonce, acheteur (ou « hors Sooqly »), vendeur, date, statut |
| ratings | transaction, auteur, cible, note générale, trois notes par critère, rôle |
| favorites | membre, annonce, alerte de prix activée |
| search_alerts | membre, filtres enregistrés, notifications activées, dernier envoi, nouvelles annonces |
| blocks | membre, membre bloqué, date |
| reports | auteur, annonce ou membre visé, motif, précisions, traitement |
| wilayas | code, nom français, nom arabe, coordonnées du chef-lieu |
| categories | clé, noms FR/AR, sous-catégories, critères de recherche, fourchette de prix plausible |
| banned_terms | famille, langue, terme |
| charter_articles | numéro, titre et texte FR/AR, citations, version |
| settings | taux DA/€, seuil du badge, tarifs de mise en avant, durée de vie des annonces (60 jours) |

Règles d’accès (« RLS ») sur toutes les tables : chacun ne lit que ses messages, documents, alertes, blocages et brouillons ; les annonces en ligne sont publiques ; un membre bloqué ne peut pas créer de message vers celui qui l’a bloqué.

## 7. Sécurité, vie privée et modération

Sooqly stocke des numéros de téléphone, des permis de conduire et des conversations privées : la sécurité est une exigence, pas une option.

- Sécurité au niveau des lignes (RLS) sur toutes les tables, testée avec un compte membre et un compte visiteur.
- Permis et documents dans un espace de stockage privé, accessibles par liens temporaires, effacés automatiquement à la date prévue.
- Aucune clé secrète dans le code de l’application ; les opérations sensibles (détecteur photo, effacements, notifications, SMS) tournent côté serveur (fonctions Supabase).
- Mots de passe et sessions gérés par Supabase Auth ; numéro de téléphone obligatoire à l’inscription (sans vérification par SMS pour l’instant) ; session renouvelée automatiquement jusqu’à la déconnexion.
- Aucune coordonnée personnelle affichée publiquement ; numéros et e-mails masqués automatiquement dans les messages et descriptions.
- Signalement anonyme sur chaque annonce, profil et discussion ; blocage d’un membre ; détection des demandes d’avance dans les messages.

**Espace de modération (web, réservé aux modérateurs)**

- File des annonces à valider, avec photos et résultat du détecteur : Valider, Refuser (motif), Demander une correction.
- File des signalements, historique par membre, suspension et exclusion.
- Réglages : taux DA/€, seuil du badge, mots interdits, tarifs de mise en avant, texte de la charte.
- La modération applique la charte ; elle ne tranche jamais un litige entre membres.

Avant le lancement : revue de sécurité complète par Claude Code, puis, si possible, relecture par un développeur indépendant. Politique de confidentialité exigée par Google Play et l’App Store, à relire par un juriste.

## 8. Périmètre et critères d’acceptation

| Version 1 (lancement) | Version 2 (après lancement) |
| --- | --- |
| Accueil au premier lancement, comptes, téléphone vérifié, charte, français et arabe | Paiement en ligne de la mise en avant (CIB, Edahabia) |
| Annonces en 5 étapes, 10 photos, détecteur, modération | Abonnement pro mensuel |
| Recherche, filtres par catégorie, tri, 69 wilayas | Création du bordereau d’envoi et suivi de colis via les sociétés de livraison |
| Location courte et longue durée, disponibilités, permis | Statistiques détaillées pour les pros |
| Messagerie : réponses rapides, vocal, lieu de rendez-vous | Mode sombre |
| Remise et livraison, prix ferme ou négociable, échange | Se déconnecter de tous mes appareils |
| Alertes de recherche et de prix, notifications | — |
| Mes annonces : statuts, statistiques, expiration, republication | — |
| Notation et badge « Vendeur validé » | — |
| Signalement, blocage, conseils anti-arnaque | — |
| Parrainage, charte, espace de modération | — |
| Mise en avant activée à la main par l’administrateur | — |

La version 1 est acceptée quand :

- [ ] Chaque écran de la maquette existe et fonctionne sur Android, iPhone et le web, en français et en arabe (de droite à gauche).
- [ ] Une annonce contenant un mot interdit, une photo avec visage ou un prix incohérent ne peut pas être envoyée.
- [ ] Un compte ne peut pas être créé sans numéro de téléphone ni acceptation de la charte, et reste connecté après fermeture de l’application.
- [ ] Une recherche de location sur 6 mois n’affiche que les biens qui ont un tarif adapté et sont disponibles.
- [ ] Une nouvelle annonce validée déclenche la notification des alertes qui lui correspondent.
- [ ] Une annonce passe en « Expirée » après 60 jours et peut être republiée.
- [ ] Un membre bloqué ne peut plus envoyer de message.
- [ ] Un permis envoyé n’est visible que par son destinataire et disparaît à la date prévue.
- [ ] Un membre ne peut lire aucune conversation qui ne le concerne pas (test avec deux comptes).
- [ ] Le badge apparaît dès la 10e vente notée 5 étoiles.
- [ ] La revue de sécurité ne laisse aucun point critique ouvert.
- [ ] Dix testeurs ont utilisé l’application une semaine sans blocage.
