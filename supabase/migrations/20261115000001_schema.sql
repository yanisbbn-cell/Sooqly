-- Sooqly – étape 2 : tables de la base de données.
-- Toutes les tables ont la sécurité au niveau des lignes (RLS) activée dans le fichier suivant.
-- Prix : toujours en dinars entiers (bigint), jamais de centimes.

-- ============================================================
-- Données de référence (modifiables par l'administrateur)
-- ============================================================

create table public.wilayas (
  code smallint primary key check (code between 1 and 69),
  nom_fr text not null,
  nom_ar text not null
);
comment on table public.wilayas is 'Les 69 wilayas d''Algérie, numérotées, en français et en arabe.';

create table public.categories (
  cle text primary key,
  ordre smallint not null,
  nom_fr text not null,
  nom_ar text not null,
  nom_court_fr text,
  icone text not null,
  -- Critères de recherche propres à la catégorie (carburant, surface…), remplis à l'étape 4.
  criteres jsonb not null default '[]'::jsonb,
  -- Fourchettes de prix plausibles, par type ou unité : {"Vente": [min, max], "jour": [min, max], …}
  fourchettes_prix jsonb not null default '{}'::jsonb
);

create table public.subcategories (
  id bigint generated always as identity primary key,
  categorie text not null references public.categories (cle) on update cascade on delete cascade,
  ordre smallint not null,
  nom_fr text not null,
  nom_ar text not null,
  unique (categorie, nom_fr)
);

create table public.banned_families (
  cle text primary key,
  -- interdit : bloque l'envoi ; professionnel : invite à passer en Professionnel
  effet text not null default 'interdit' check (effet in ('interdit', 'professionnel')),
  motif_fr text not null,
  motif_ar text not null
);

create table public.banned_terms (
  id bigint generated always as identity primary key,
  famille text not null references public.banned_families (cle) on update cascade on delete cascade,
  langue text not null check (langue in ('fr', 'ar')),
  -- Terme normalisé : sans accents ni harakât, hamza ramenée à alif.
  terme text not null,
  unique (famille, langue, terme)
);

create table public.charter_articles (
  numero smallint primary key check (numero between 1 and 99),
  titre_fr text not null,
  titre_ar text not null,
  -- [{ "fr": "...", "ar": "..." }]
  paragraphes jsonb not null default '[]'::jsonb,
  puces jsonb not null default '[]'::jsonb,
  -- [{ "ar": "texte arabe", "fr": "traduction", "ref_fr": "...", "ref_ar": "..." }]
  citations jsonb not null default '[]'::jsonb,
  version integer not null default 1
);

create table public.charter_texts (
  cle text primary key check (cle in ('preambule', 'conclusion', 'mise_a_jour')),
  texte_fr text not null,
  texte_ar text not null,
  version integer not null default 1
);

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  -- Valeur indicative d'un dinar en euros (1 000 DA ≈ 3,70 €).
  taux_dinar_euro numeric(12, 6) not null default 0.0037,
  seuil_badge integer not null default 10,
  duree_vie_annonce_jours integer not null default 60,
  rappel_expiration_jours integer not null default 7,
  tarifs_mise_en_avant jsonb not null default '{}'::jsonb,
  version_charte integer not null default 1,
  modifie_le timestamptz not null default now()
);

-- ============================================================
-- Membres
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom_affiche text not null check (char_length(nom_affiche) between 2 and 60),
  wilaya_code smallint references public.wilayas (code),
  ville text,
  telephone_verifie boolean not null default false,
  avatar smallint check (avatar between 1 and 40),
  langue text not null default 'fr' check (langue in ('fr', 'ar')),
  est_pro boolean not null default false,
  activite_pro text,
  nom_commercial text,
  charte_acceptee_le timestamptz,
  charte_version integer,
  code_parrainage text unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  parrain_id uuid references public.profiles (id) on delete set null,
  role text not null default 'membre' check (role in ('membre', 'moderateur', 'admin')),
  suspendu boolean not null default false,
  cree_le timestamptz not null default now()
);

-- ============================================================
-- Annonces
-- ============================================================

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('vente', 'location', 'service', 'don')),
  categorie text not null references public.categories (cle) on update cascade,
  sous_categorie_id bigint references public.subcategories (id),
  titre text not null check (char_length(titre) between 3 and 90),
  description text not null default '',
  etat text check (etat in ('neuf', 'tres_bon', 'bon', 'satisfaisant', 'mauvais')),
  caracteristiques jsonb not null default '{}'::jsonb,
  -- Prix en dinars entiers. Les dons sont gratuits (0).
  prix_da bigint not null default 0 check (prix_da >= 0),
  prix_ferme boolean not null default true,
  echange_accepte boolean not null default false,
  remise_main_propre boolean not null default false,
  livraison_wilaya boolean not null default false,
  envoi_algerie boolean not null default false,
  wilaya_code smallint not null references public.wilayas (code),
  ville text,
  statut text not null default 'verification'
    check (statut in ('verification', 'en_ligne', 'reserve', 'vendu', 'loue', 'expire', 'refuse')),
  motif_refus text,
  publie_le timestamptz,
  expire_le timestamptz,
  acheteur_id uuid references public.profiles (id) on delete set null,
  sponsorise_jusqu timestamptz,
  permis_exige boolean not null default false,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  check (type <> 'don' or prix_da = 0)
);
create index listings_statut_idx on public.listings (statut, publie_le desc);
create index listings_auteur_idx on public.listings (auteur_id);
create index listings_categorie_idx on public.listings (categorie, wilaya_code);

create table public.listing_rates (
  id bigint generated always as identity primary key,
  annonce_id uuid not null references public.listings (id) on delete cascade,
  unite text not null check (unite in ('nuit', 'jour', 'semaine', 'mois', '6_mois', 'an')),
  prix_da bigint not null check (prix_da > 0),
  unique (annonce_id, unite)
);

create table public.listing_photos (
  id bigint generated always as identity primary key,
  annonce_id uuid not null references public.listings (id) on delete cascade,
  fichier text not null,
  ordre smallint not null check (ordre between 1 and 10),
  angle text,
  resultat_detecteur jsonb,
  decision_moderation text not null default 'en_attente'
    check (decision_moderation in ('en_attente', 'acceptee', 'refusee')),
  unique (annonce_id, ordre)
);

create table public.listing_prices (
  id bigint generated always as identity primary key,
  annonce_id uuid not null references public.listings (id) on delete cascade,
  ancien_prix_da bigint not null,
  nouveau_prix_da bigint not null,
  date timestamptz not null default now()
);

create table public.listing_stats (
  annonce_id uuid not null references public.listings (id) on delete cascade,
  jour date not null,
  vues integer not null default 0,
  favoris integer not null default 0,
  messages integer not null default 0,
  primary key (annonce_id, jour)
);

create table public.availability (
  id bigint generated always as identity primary key,
  annonce_id uuid not null references public.listings (id) on delete cascade,
  debut date not null,
  fin date not null,
  check (fin >= debut)
);

-- ============================================================
-- Messagerie et documents privés
-- ============================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.listings (id) on delete cascade,
  acheteur_id uuid not null references public.profiles (id) on delete cascade,
  vendeur_id uuid not null references public.profiles (id) on delete cascade,
  dernier_message_le timestamptz not null default now(),
  cree_le timestamptz not null default now(),
  unique (annonce_id, acheteur_id),
  check (acheteur_id <> vendeur_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  auteur_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'texte' check (type in ('texte', 'vocal', 'lieu', 'permis')),
  contenu text,
  fichier text,
  duree_secondes integer,
  lieu_nom text,
  lieu_lat double precision,
  lieu_lng double precision,
  lu boolean not null default false,
  cree_le timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, cree_le);

create table public.private_documents (
  id uuid primary key default gen_random_uuid(),
  expediteur_id uuid not null references public.profiles (id) on delete cascade,
  destinataire_id uuid not null references public.profiles (id) on delete cascade,
  annonce_id uuid references public.listings (id) on delete set null,
  fichier text not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'accepte', 'refuse')),
  efface_le timestamptz not null,
  cree_le timestamptz not null default now()
);

-- ============================================================
-- Transactions, notes et confiance
-- ============================================================

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references public.listings (id) on delete cascade,
  -- null = conclue « hors de Sooqly »
  acheteur_id uuid references public.profiles (id) on delete set null,
  vendeur_id uuid not null references public.profiles (id) on delete cascade,
  date timestamptz not null default now(),
  statut text not null default 'conclue' check (statut in ('conclue', 'annulee'))
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  auteur_id uuid not null references public.profiles (id) on delete cascade,
  cible_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('acheteur', 'vendeur')),
  note smallint not null check (note between 1 and 5),
  critere_1 smallint not null check (critere_1 between 1 and 5),
  critere_2 smallint not null check (critere_2 between 1 and 5),
  critere_3 smallint not null check (critere_3 between 1 and 5),
  cree_le timestamptz not null default now(),
  unique (transaction_id, auteur_id),
  check (auteur_id <> cible_id)
);

create table public.favorites (
  membre_id uuid not null references public.profiles (id) on delete cascade,
  annonce_id uuid not null references public.listings (id) on delete cascade,
  alerte_prix boolean not null default false,
  cree_le timestamptz not null default now(),
  primary key (membre_id, annonce_id)
);

create table public.search_alerts (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid not null references public.profiles (id) on delete cascade,
  filtres jsonb not null,
  notifications boolean not null default true,
  dernier_envoi timestamptz,
  nouvelles_annonces integer not null default 0,
  cree_le timestamptz not null default now()
);

create table public.blocks (
  membre_id uuid not null references public.profiles (id) on delete cascade,
  bloque_id uuid not null references public.profiles (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (membre_id, bloque_id),
  check (membre_id <> bloque_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references public.profiles (id) on delete cascade,
  annonce_id uuid references public.listings (id) on delete cascade,
  membre_vise_id uuid references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  motif text not null,
  precisions text,
  traitement text not null default 'a_traiter' check (traitement in ('a_traiter', 'en_cours', 'traite', 'rejete')),
  traite_par uuid references public.profiles (id) on delete set null,
  cree_le timestamptz not null default now(),
  check (annonce_id is not null or membre_vise_id is not null)
);
