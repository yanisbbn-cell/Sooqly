# Sooqly – rapport de sécurité (étape 13)

Date : 16 novembre 2026 · Version de l'appli : branche `claude/etape-1-squelette-expo-go-d1ovvi` · Projet Supabase `asaltwruyylfoktdnnkw` (UE, Paris).

Ce rapport s'adresse à Yanis et au développeur indépendant qui le relira. Il résume ce qui a été vérifié, ce qui a été corrigé et ce qui reste à décider.

## 1. Méthode

- Outil de contrôle de sécurité de Supabase (« Security Advisor »).
- Relecture de toutes les règles d'accès (RLS) des 25 tables, des fonctions du serveur (`public` et `prive`), des règles des fichiers (Storage) et des réglages d'authentification.
- Tests automatiques : `supabase/tests/rls.sql` (23 blocs, exécutés dans une transaction annulée à la fin ; résultat attendu `TESTS_OK`). Ils jouent les rôles visiteur, membre, autre membre, modérateur et administrateur, et essaient de contourner chaque règle.
- Recherche de clés secrètes dans le code, dans tout l'historique Git et dans le site publié.
- Audit des bibliothèques (`npm audit`).
- Essais dans un navigateur avec des comptes fictifs (supprimés ensuite).

## 2. Ce qui est en place (vérifié)

| Domaine | Vérification |
| --- | --- |
| Règles d'accès | RLS activée **et forcée** sur toutes les tables. Chacun ne lit que ses messages, documents, alertes, blocages, favoris, transactions ; les réglages et la charte ne s'écrivent que par l'administrateur. |
| Rôles | Personne ne peut se donner un rôle (modérateur, administrateur), se déclarer « téléphone vérifié » ou modifier son parrain. Les décisions de modération passent par des fonctions qui vérifient le rôle. |
| Messagerie | Un membre bloqué ou suspendu ne peut plus écrire ; numéros et e-mails masqués automatiquement par le serveur. |
| Fichiers | Photos d'annonces publiques (JPEG, 2 Mo max) ; vocaux privés aux deux participants ; permis privés au seul destinataire, effacés à la date prévue. |
| Clés | Aucune clé secrète dans le code, l'historique Git ni le site. L'appli n'utilise que la clé « publishable » (publique par nature, protégée par la RLS). La clé de service est rangée dans le coffre-fort de la base (Vault), utilisée seulement par le serveur. |
| Mots de passe | 8 caractères minimum, chiffrés par Supabase ; changer son mot de passe ou supprimer son compte demande le mot de passe actuel. |
| Notifications | Envoyées par le serveur ; un membre ne lit que ses propres jetons d'appareil. |

## 3. Problèmes trouvés et corrigés

Migration : `supabase/migrations/20261123000001_securite.sql`.

| # | Gravité | Problème | Correction |
| --- | --- | --- | --- |
| 1 | Moyenne | Un membre **exclu** pouvait supprimer son compte puis se réinscrire avec le même numéro. | Empreinte SHA-256 du numéro gardée à l'exclusion (jamais le numéro) ; l'inscription est refusée pour ce numéro. |
| 2 | Moyenne | Un membre pouvait déposer des photos dans son dossier public **sans les rattacher à une annonce** (donc sans modération). | Nettoyage chaque nuit des fichiers orphelins (photos, vocaux, permis) via l'API de stockage. |
| 3 | Moyenne | Aucune limite d'envoi : messages, discussions, signalements, annonces ou permis pouvaient être envoyés en rafale. | Limites côté serveur : 30 messages/minute, 30 nouvelles discussions/heure, 20 signalements/jour, 20 annonces/jour, 10 documents/jour (sauf modération). |
| 4 | Faible | Les profils publics exposaient des colonnes inutiles : code de parrainage, parrain, langue, dates d'acceptation de la charte. | Droits par colonne : le public ne voit que les colonnes utiles ; le code de parrainage passe par des fonctions dédiées. |
| 5 | Faible | Des fonctions propres à un membre connecté étaient appelables par un visiteur (elles ne renvoyaient rien). | Droit d'exécution retiré aux visiteurs. |
| 6 | Faible | Messages vocaux : aucun contrôle du type de fichier. | Seuls les formats audio sont acceptés. |
| 7 | Faible | Site web sans en-têtes de sécurité ; adresse du site déclarée dans Supabase = `localhost`. | En-têtes ajoutés (`deploiement/vercel.json` : anti-intégration dans un autre site, `nosniff`, HSTS, permissions) ; adresse du site corrigée. |
| 8 | — | Obligation Apple : pouvoir supprimer son compte. | « Supprimer mon compte » (Compte) : profil, annonces, photos, discussions, vocaux, documents, favoris, alertes effacés ; les notes données aux autres restent, sans nom (« Ancien membre »). Le compte administrateur ne peut pas se supprimer sans transmettre son rôle. |

Politique de confidentialité : écran « Confidentialité » (Compte, et lien sur l'inscription), en français et en arabe ; adresse web `https://sooqly-two.vercel.app/confidentialite`.

## 4. À décider (non corrigé ici)

| # | Priorité | Sujet | Recommandation |
| --- | --- | --- | --- |
| A | ~~Haute~~ **Fait** | Anciennes clés API (`anon`, `service_role`) et ancienne clé de signature JWT (HS256) encore actives ; l'ancien secret JWT avait été affiché dans la session de travail de Claude pendant la revue. | Fait le 16 novembre 2026 avec l'accord de Yanis : anciennes clés API désactivées, ancienne clé JWT révoquée. Vérifié ensuite : lecture publique, inscription, requêtes connectées et API de stockage fonctionnent. |
| B | Haute | **Création de comptes en masse** possible (pas de vérification par SMS). | CAPTCHA Cloudflare Turnstile ajouté à l'inscription, à la connexion, au changement de mot de passe et à la suppression de compte (`src/components/Captcha*.tsx`). Le contrôle côté serveur s'active dans Supabase (Authentication → Attack Protection) avec la clé secrète Turnstile, rangée uniquement là. |
| C | Moyenne | Vérification des mots de passe déjà piratés (HaveIBeenPwned) : réservée à l'offre Supabase **Pro**. | À activer si l'offre Pro est prise pour le lancement. |
| D | Juridique | Loi algérienne 18-07 (données personnelles) : déclaration/autorisation auprès de l'**ANPDP**, et **transfert des données hors d'Algérie** (hébergement dans l'UE) soumis à autorisation. Membres résidant dans l'UE : RGPD. | Faire relire la politique de confidentialité et ces démarches par un juriste. |
| E | Juridique | Âge minimum pour utiliser Sooqly : non défini. | À fixer avec le juriste (et dans les fiches des magasins). |
| F | Faible | 3 alertes « moyennes » (`npm audit`) dans un outil de construction d'Expo (`@expo/fingerprint` → `minimatch`), qui ne s'exécute pas sur les téléphones. | Mettre à jour Expo quand un correctif sort. |
| G | Faible | Les modérateurs peuvent modifier n'importe quelle annonce ou profil (rôle de confiance). | Ne nommer que des personnes de confiance ; le journal des décisions garde la trace des décisions de modération. |
| H | Faible | Le compteur de vues peut être gonflé artificiellement ; le détecteur de photos tourne sur le téléphone (contournable). | Acceptable : chaque annonce est vérifiée par un modérateur avant sa mise en ligne. |

## 5. Pour le développeur relecteur

- Schéma et règles : `supabase/migrations/*.sql` (dans l'ordre), tests : `supabase/tests/rls.sql`.
- Fonctions sensibles : `prive.proteger_profil`, `prive.proteger_annonce`, `prive.proteger_photo`, `public.moderer_*`, `public.sponsoriser`, `public.changer_role`, `public.publier_article_charte`, `public.supprimer_mon_compte`, `prive.effacer_fichiers`.
- Appli : `src/lib/*.ts` (accès aux données), écrans dans `src/app`.
- Points d'attention : fonctions `security definer` (toutes avec `search_path = ''`), tâches planifiées (`cron.job`), appels sortants `pg_net` (Expo Push, API de stockage).
