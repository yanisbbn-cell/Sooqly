-- Sooqly – décision de Yanis du 17 novembre 2026 : cours particuliers entre personnes du même sexe.
-- • Chaque membre indique à l'inscription s'il est un homme ou une femme. Ce choix est PRIVÉ (jamais lisible
--   par les autres membres) et ne se modifie que par la modération.
-- • Dans les sous-catégories « réservées » (pour l'instant : Cours et soutien scolaire), le professeur choisit
--   le public : « enfants » (primaire, collège : visible et contactable par tous les parents)
--   ou « adultes » (lycée et adultes : visible et contactable seulement par les membres du même sexe).
-- • La règle est appliquée par la base (RLS) : liste, fiche, photos, tarifs, contact et alertes.

-- 1. Le sexe du membre (privé).
alter table public.profiles add column sexe text check (sexe in ('h', 'f'));
grant insert (sexe) on public.profiles to authenticated;
-- Pas de droit de lecture ni de modification directe : lecture par mon_sexe(), réglage par definir_mon_sexe().

create or replace function prive.mon_sexe()
returns text language sql stable security definer set search_path = '' as $$
  select p.sexe from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.mon_sexe()
returns text language sql stable security definer set search_path = '' as $$
  select prive.mon_sexe();
$$;
revoke execute on function public.mon_sexe() from public, anon;
grant execute on function public.mon_sexe() to authenticated;

-- Pour les membres inscrits avant cette règle : une seule fois, tant que rien n'est indiqué.
create or replace function public.definir_mon_sexe(p_sexe text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_sexe not in ('h', 'f') then raise exception 'Valeur inconnue' using errcode = 'P0001'; end if;
  perform set_config('sooqly.sexe', 'oui', true);
  update public.profiles set sexe = p_sexe where id = (select auth.uid()) and sexe is null;
  get diagnostics n = row_count;
  perform set_config('sooqly.sexe', '', true);
  return n = 1;
end $$;
revoke execute on function public.definir_mon_sexe(text) from public, anon;
grant execute on function public.definir_mon_sexe(text) to authenticated;

-- Correction par la modération (erreur de saisie signalée par le membre).
alter table public.moderation_actions drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check check (action in
  ('valider', 'refuser', 'correction', 'retirer', 'suspendre', 'reactiver', 'exclure', 'sponsoriser', 'role', 'sexe'));

create or replace function public.changer_sexe_membre(p_membre uuid, p_sexe text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  if p_sexe not in ('h', 'f') then raise exception 'Valeur inconnue' using errcode = 'P0001'; end if;
  update public.profiles set sexe = p_sexe where id = p_membre;
  if not found then return false; end if;
  insert into public.moderation_actions (moderateur_id, membre_id, action, motif)
  values ((select auth.uid()), p_membre, 'sexe', null);
  return true;
end $$;
revoke execute on function public.changer_sexe_membre(uuid, text) from public, anon;
grant execute on function public.changer_sexe_membre(uuid, text) to authenticated;

-- Lecture du sexe d'un membre par la modération seulement.
create or replace function public.sexe_membre(p_membre uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  return (select p.sexe from public.profiles p where p.id = p_membre);
end $$;
revoke execute on function public.sexe_membre(uuid) from public, anon;
grant execute on function public.sexe_membre(uuid) to authenticated;

-- Obligatoire pour toute nouvelle inscription ; ensuite, modifiable seulement par definir_mon_sexe (une fois)
-- ou par la modération.
create or replace function prive.sexe_obligatoire()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.sexe is null then
      raise exception 'Indiquez si vous êtes un homme ou une femme' using errcode = 'P0001';
    end if;
  elsif new.sexe is distinct from old.sexe and not prive.est_moderateur()
        and coalesce(current_setting('sooqly.sexe', true), '') <> 'oui' then
    raise exception 'Ce choix se corrige seulement par la modération' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger sexe_obligatoire before insert or update on public.profiles for each row execute function prive.sexe_obligatoire();

-- 2. Les sous-catégories réservées et le public du cours.
alter table public.subcategories add column reservee_meme_sexe boolean not null default false;
update public.subcategories set reservee_meme_sexe = true where categorie = 'services' and nom_fr = 'Cours et soutien scolaire';

alter table public.listings
  add column public_cours text check (public_cours in ('enfants', 'adultes')),
  add column sexe_auteur text check (sexe_auteur in ('h', 'f')),
  add column reserve_meme_sexe boolean not null default false;

create or replace function prive.regle_cours()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  reservee boolean;
begin
  select coalesce(s.reservee_meme_sexe, false) into reservee from public.subcategories s where s.id = new.sous_categorie_id;
  if not coalesce(reservee, false) then
    new.public_cours := null;
    new.sexe_auteur := null;
    new.reserve_meme_sexe := false;
    return new;
  end if;
  new.sexe_auteur := (select p.sexe from public.profiles p where p.id = new.auteur_id);
  if tg_op = 'INSERT' or new.sous_categorie_id is distinct from old.sous_categorie_id
     or new.public_cours is distinct from old.public_cours then
    if new.public_cours is null then
      raise exception 'Choisissez le public du cours' using errcode = 'P0001';
    end if;
    if new.sexe_auteur is null then
      raise exception 'Indiquez d''abord si vous êtes un homme ou une femme' using errcode = 'P0001';
    end if;
  end if;
  new.reserve_meme_sexe := coalesce(new.public_cours, 'enfants') = 'adultes';
  return new;
end $$;
create trigger regle_cours before insert or update on public.listings for each row execute function prive.regle_cours();

-- Quand la modération corrige le sexe d'un membre, ses annonces de cours suivent.
create or replace function prive.sexe_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.sexe is distinct from old.sexe then
    update public.listings set sexe_auteur = new.sexe where auteur_id = new.id and public_cours is not null;
  end if;
  return new;
end $$;
create trigger sexe_change after update of sexe on public.profiles for each row execute function prive.sexe_change();

-- Un public modifié est un changement de contenu : l'annonce repasse en vérification.
CREATE OR REPLACE FUNCTION prive.proteger_annonce()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  contenu_change boolean;
  fourchettes jsonb;
  bornes jsonb;
begin
  new.modifie_le := now();

  if new.categorie = 'dons' then
    new.type := 'don';
    new.prix_da := 0;
  elsif new.categorie = 'services' then
    new.type := 'service';
  elsif new.type in ('don', 'service') then
    raise exception 'Type d''annonce incompatible avec la catégorie' using errcode = 'P0001';
  elsif new.type = 'location' and new.categorie not in ('immobilier', 'vehicules') then
    raise exception 'La location concerne seulement les logements et les véhicules' using errcode = 'P0001';
  end if;

  if new.sous_categorie_id is not null and not exists (
    select 1 from public.subcategories s where s.id = new.sous_categorie_id and s.categorie = new.categorie
  ) then
    raise exception 'Sous-catégorie incompatible avec la catégorie' using errcode = 'P0001';
  end if;

  if new.type in ('vente', 'service') and (tg_op = 'INSERT' or new.prix_da is distinct from old.prix_da) then
    select c.fourchettes_prix into fourchettes from public.categories c where c.cle = new.categorie;
    bornes := coalesce(fourchettes -> (case new.type when 'service' then 'Service' else 'Vente' end), fourchettes -> 'Vente');
    if bornes is not null and (new.prix_da < (bornes ->> 0)::bigint or new.prix_da > (bornes ->> 1)::bigint) then
      raise exception 'Prix incohérent pour cette catégorie' using errcode = 'P0001';
    end if;
  end if;

  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;

  if tg_op = 'INSERT' then
    new.statut := 'verification';
    new.motif_refus := null;
    new.publie_le := null;
    new.expire_le := null;
    new.sponsorise_jusqu := null;
    new.acheteur_id := null;
    return new;
  end if;
  if new.auteur_id is distinct from old.auteur_id then raise exception 'Auteur non modifiable'; end if;
  if new.sponsorise_jusqu is distinct from old.sponsorise_jusqu
     or new.motif_refus is distinct from old.motif_refus
     or new.publie_le is distinct from old.publie_le
     or new.expire_le is distinct from old.expire_le
     or new.correction_demandee is distinct from old.correction_demandee then
    raise exception 'Champ réservé à la modération';
  end if;

  -- Étape 10 : une annonce en ligne dont le contenu change repasse « En vérification »
  -- (seul le prix peut changer sans nouvelle vérification).
  contenu_change := (new.titre, new.description, new.categorie, new.sous_categorie_id, new.type, new.etat,
                     new.caracteristiques, new.wilaya_code, new.ville, new.permis_exige, new.public_cours)
    is distinct from (old.titre, old.description, old.categorie, old.sous_categorie_id, old.type, old.etat,
                      old.caracteristiques, old.wilaya_code, old.ville, old.permis_exige, old.public_cours);
  if contenu_change and old.statut in ('en_ligne', 'reserve', 'refuse') then
    new.statut := 'verification';
  end if;
  -- Retour en vérification (après une correction demandée, par exemple) : la demande est close.
  if new.statut = 'verification' and old.statut <> 'verification' then
    new.correction_demandee := false;
  end if;

  if new.statut is distinct from old.statut and not (
       (old.statut = 'en_ligne' and new.statut in ('reserve', 'vendu', 'loue', 'verification'))
    or (old.statut = 'reserve' and new.statut in ('en_ligne', 'vendu', 'loue', 'verification'))
    or (old.statut in ('refuse', 'expire') and new.statut = 'verification')
    or (old.statut = 'expire' and new.statut = 'en_ligne' and not contenu_change)
  ) then
    raise exception 'Changement de statut non autorisé';
  end if;

  -- Republication gratuite d'une annonce expirée : de nouveau 60 jours (réglage).
  if old.statut = 'expire' and new.statut = 'en_ligne' then
    new.publie_le := now();
    new.expire_le := now() + make_interval(days => (select s.duree_vie_annonce_jours from public.settings s where s.id = 1));
  end if;
  return new;
end $function$;

-- 3. Visibilité (RLS) : un cours « adultes » n'est visible que par les membres du même sexe que le professeur.
create or replace function prive.cours_ouvert(p_reserve boolean, p_sexe_auteur text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not p_reserve or p_sexe_auteur = prive.mon_sexe();
$$;

drop policy "annonces visibles" on public.listings;
create policy "annonces visibles" on public.listings for select to anon, authenticated using (
  ((statut in ('en_ligne', 'reserve')) and not prive.auteur_suspendu(auteur_id)
     and (not reserve_meme_sexe or sexe_auteur = (select prive.mon_sexe())))
  or auteur_id = (select auth.uid()) or prive.est_moderateur()
);

create or replace function prive.annonce_visible(p_annonce uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_annonce
      and ((l.statut in ('en_ligne', 'reserve') and not prive.auteur_suspendu(l.auteur_id)
            and prive.cours_ouvert(l.reserve_meme_sexe, l.sexe_auteur))
           or l.auteur_id = (select auth.uid()) or prive.est_moderateur())
  );
$$;

-- Contact : la règle est vérifiée explicitement (en plus de la visibilité).
drop policy "contacter un vendeur" on public.conversations;
create policy "contacter un vendeur" on public.conversations for insert to authenticated with check (
  acheteur_id = (select auth.uid()) and prive.membre_actif()
  and exists (
    select 1 from public.listings l
    where l.id = conversations.annonce_id and l.auteur_id = conversations.vendeur_id
      and l.statut in ('en_ligne', 'reserve')
      and prive.cours_ouvert(l.reserve_meme_sexe, l.sexe_auteur)
  )
  and not prive.a_bloque(vendeur_id, acheteur_id)
);

-- 4. Données existantes : l'annonce de cours d'exemple est ouverte aux enfants ; le compte d'exemple est un homme.
update public.profiles set sexe = 'h'
where id in (select u.id from auth.users u where u.phone = '213555000099');
update public.listings set public_cours = 'enfants'
where sous_categorie_id in (select s.id from public.subcategories s where s.reservee_meme_sexe) and public_cours is null;

-- 5. Alertes de recherche : même règle.
CREATE OR REPLACE FUNCTION prive.prevenir_alertes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pro boolean;
  envois jsonb;
begin
  if not (old.statut = 'verification' and new.statut = 'en_ligne' and old.publie_le is null) then return new; end if;
  select p.est_pro into pro from public.profiles p where p.id = new.auteur_id;

  with touchees as (
    update public.search_alerts a
      set nouvelles_annonces = a.nouvelles_annonces + 1, dernier_envoi = now()
    where a.membre_id <> new.auteur_id
      and not exists (select 1 from public.blocks b where b.membre_id = a.membre_id and b.bloque_id = new.auteur_id)
      and prive.annonce_correspond(a.filtres, new, coalesce(pro, false))
      -- Cours « adultes » : seulement les membres du même sexe que le professeur.
      and (not new.reserve_meme_sexe or exists (select 1 from public.profiles p2 where p2.id = a.membre_id and p2.sexe = new.sexe_auteur))
    returning a.id, a.membre_id, a.notifications
  )
  select jsonb_agg(jsonb_build_object(
      'to', t.jeton,
      'title', case when p.langue = 'ar' then 'إعلان جديد يطابق تنبيهك' else 'Nouvelle annonce pour votre alerte' end,
      'body', new.titre || case when new.type = 'don' then '' else ' · ' || replace(to_char(new.prix_da, 'FM999,999,999'), ',', ' ')
              || case when p.langue = 'ar' then ' دج' else ' DA' end end,
      'sound', 'default',
      'data', jsonb_build_object('annonce_id', new.id)))
    into envois
  from touchees x
  join public.profiles p on p.id = x.membre_id
  join public.push_tokens t on t.membre_id = x.membre_id
  where x.notifications;

  if envois is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  -- Une alerte ratée ne doit jamais empêcher la validation de l'annonce.
  return new;
end $function$;
