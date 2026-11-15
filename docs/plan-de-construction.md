# Sooqly – Plan de construction pas à pas

Yanis construit Sooqly depuis sa tablette avec Claude Code dans le navigateur, une étape à la fois, en testant chaque étape sur son téléphone avant de passer à la suivante.

## Façon de travailler

1. Une seule étape du plan à la fois ; Claude Code explique d’abord ce qu’il va faire et ce que Yanis doit faire de son côté, puis attend son accord.
2. Claude Code propose ses changements sur GitHub ; Yanis les accepte d’un clic.
3. Test sur Expo Go. En cas d’erreur, Yanis envoie le message ou une capture, Claude Code corrige.
4. Aucune clé secrète dans le code : Claude Code indique où la ranger.

## Les étapes

| # | Étape | Claude Code fait | Yanis fait | Test de fin d’étape |
| --- | --- | --- | --- | --- |
| 0 | Règles du projet | Rédige CLAUDE.md : principes de la charte, palette et règle des couleurs, polices, français et arabe obligatoires | Relit et valide | Le fichier reprend les principes du cahier des charges |
| 1 | Squelette | Projet Expo, navigation à 5 onglets, palette, polices, bascule français/arabe, accueil au premier lancement | Ouvre l’appli dans Expo Go | Les 5 onglets s’affichent ; l’arabe passe de droite à gauche |
| 2 | Base de données | Tables, règles d’accès, 69 wilayas, catégories et sous-catégories, mots interdits, charte | Crée le projet Supabase, copie les clés là où c’est indiqué | Les wilayas et la charte s’affichent dans l’appli |
| 3 | Comptes | Inscription (nom ou kounia, wilaya, ville, téléphone vérifié par SMS, charte), image de profil, session persistante | Crée deux comptes de test | Impossible de s’inscrire sans SMS ni charte ; on reste connecté |
| 4 | Annonces | Assistant de publication en 5 étapes (sans photos), accueil, fiche, catégories, filtres, tri, recherche | Publie trois annonces | Filtres, critères et tri fonctionnent ; un prix incohérent bloque |
| 5 | Photos et détecteur | 10 photos avec angles, détecteur de mots, détecteur d’images, file de modération | Choisit le service de détection proposé | Un mot interdit et une photo avec visage sont bloqués |
| 6 | Location | Tarifs par durée, disponibilités, recherche façon Booking, totaux | Publie un logement et une voiture à louer | Une recherche sur 6 mois montre le bon total |
| 7 | Messagerie | Contacter, discussions en temps réel, réponses rapides, vocal, lieu de rendez-vous, conseils anti-arnaque, notifications | Échange entre ses deux comptes | Un compte ne voit jamais les discussions de l’autre |
| 8 | Permis | Téléversement privé, Documents reçus, effacement automatique | Envoie un permis fictif | Seul le loueur le voit |
| 9 | Confiance | Signalement, blocage, notation rapide, badge | Signale, bloque, note des deux côtés | Le membre bloqué ne peut plus écrire ; la note apparaît |
| 10 | Suivi des annonces | Mes annonces (statuts, statistiques, expiration, republication), Favoris, alertes de recherche et de prix | Crée une alerte puis publie une annonce qui y correspond | La notification arrive |
| 11 | Livraison et options | Remise et livraison, filtre « Livrable chez moi », prix ferme ou négociable, échange, parrainage | Publie un objet livrable | Il apparaît avec le filtre de livraison |
| 12 | Modération | Espace web des modérateurs et réglages, mise en avant activée à la main | Valide et refuse des annonces | Une annonce refusée n’apparaît pas |
| 13 | Sécurité | Revue complète, corrections, politique de confidentialité | Fait relire si possible par un développeur | Aucun point critique ouvert |
| 14 | Test réel | Versions de test Android et iPhone | Invite dix testeurs pendant une semaine | Retours notés et corrigés |
| 15 | Publication | Fiches des magasins, icône, site sur Vercel | Paie les comptes développeur, soumet | Sooqly est en ligne sur Android, iPhone et le web |

## Modifier en cours de route

Toutes les envies de modification vont dans les « Issues » du dépôt GitHub, une par ligne, avec capture si besoin.

| Taille de la modification | Où la faire |
| --- | --- |
| Petite (texte, couleur, bouton déplacé) | Directement dans Claude Code |
| Nouvelle fonction ou écran modifié | D’abord dans la maquette, puis Claude Code |
| Règle importante (paiement, inscription, charte) | Maquette, puis cahier des charges, puis Claude Code |

Trois réflexes : finir l’étape en cours avant de changer quoi que ce soit ; une demande à la fois ; tester sur le téléphone avant de valider.
