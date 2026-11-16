-- Sooqly – étape 12, partie 1 : espace de modération (annonces, signalements, membres).

alter table public.listings add column correction_demandee boolean not null default false;
alter table public.profiles add column exclu boolean not null default false;

-- 1. Annonces : « Demander une correction » est réservé à la modération ; une annonce refusée
--    puis modifiée repart en vérification.
create or replace function prive.proteger_annonce()
returns trigger language plpgsql security definer set search_path = '' as $$
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
                     new.caracteristiques, new.wilaya_code, new.ville, new.permis_exige)
    is distinct from (old.titre, old.description, old.categorie, old.sous_categorie_id, old.type, old.etat,
                      old.caracteristiques, old.wilaya_code, old.ville, old.permis_exige);
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
end $$;

create or replace function prive.photo_ajoutee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  update public.listings set statut = 'verification'
  where id = new.annonce_id and statut in ('en_ligne', 'reserve', 'expire', 'refuse');
  return new;
end $$;

-- 2. Membres suspendus ou exclus : leurs annonces sont masquées pour tous (sauf eux et la modération).
create or replace function prive.proteger_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a_un_telephone boolean;
begin
  -- Les opérations côté serveur (sans utilisateur connecté) ne sont pas limitées.
  if (select auth.uid()) is null then return new; end if;

  if tg_op = 'INSERT' then
    if prive.est_admin() then return new; end if;

    select coalesce(u.phone, '') <> '' into a_un_telephone from auth.users u where u.id = new.id;
    if not coalesce(a_un_telephone, false) then
      raise exception 'Numéro de téléphone obligatoire : inscription impossible' using errcode = 'P0001';
    end if;
    if new.charte_version is null then
      raise exception 'Charte non acceptée : inscription impossible' using errcode = 'P0001';
    end if;
    if new.wilaya_code is null or coalesce(btrim(new.ville), '') = '' then
      raise exception 'Wilaya et ville obligatoires' using errcode = 'P0001';
    end if;

    new.nom_affiche := btrim(new.nom_affiche);
    new.ville := btrim(new.ville);
    new.telephone_verifie := false;
    new.charte_acceptee_le := now();
    new.charte_version := (select s.version_charte from public.settings s where s.id = 1);
    new.role := 'membre';
    new.suspendu := false;
    new.exclu := false;
    new.est_pro := false;
    new.cree_le := now();
    -- Le parrain est enregistré ensuite par public.utiliser_code_parrainage (code vérifié par le serveur).
    new.parrain_id := null;
    new.code_parrainage := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    return new;
  end if;

  if not prive.est_admin() and new.role is distinct from old.role then
    raise exception 'Modification du rôle interdite';
  end if;
  if not prive.est_moderateur() and new.exclu is distinct from old.exclu then
    raise exception 'Modification de l''exclusion interdite';
  end if;
  if not prive.est_moderateur() and new.suspendu is distinct from old.suspendu then
    raise exception 'Modification de la suspension interdite';
  end if;
  if new.telephone_verifie is distinct from old.telephone_verifie then
    raise exception 'La vérification du téléphone est faite par le serveur';
  end if;
  if new.code_parrainage is distinct from old.code_parrainage
     or (new.parrain_id is distinct from old.parrain_id
         and not (old.parrain_id is null and coalesce(current_setting('sooqly.parrainage', true), '') = 'oui')) then
    raise exception 'Le parrainage ne peut pas être modifié';
  end if;
  if new.cree_le is distinct from old.cree_le then
    raise exception 'Date de création non modifiable';
  end if;
  return new;
end $$;

create or replace function prive.auteur_suspendu(p_membre uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.suspendu from public.profiles p where p.id = p_membre), false);
$$;
grant execute on function prive.auteur_suspendu(uuid) to anon, authenticated;

drop policy "annonces visibles" on public.listings;
create policy "annonces visibles" on public.listings for select to anon, authenticated
  using ((statut in ('en_ligne', 'reserve') and not prive.auteur_suspendu(auteur_id))
         or auteur_id = (select auth.uid()) or prive.est_moderateur());

create or replace function prive.annonce_visible(p_annonce uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_annonce
      and ((l.statut in ('en_ligne', 'reserve') and not prive.auteur_suspendu(l.auteur_id))
           or l.auteur_id = (select auth.uid()) or prive.est_moderateur())
  );
$$;

-- 3. Journal de la modération (historique par membre), lu seulement par la modération.
create table public.moderation_actions (
  id bigint generated always as identity primary key,
  moderateur_id uuid references public.profiles (id) on delete set null,
  membre_id uuid references public.profiles (id) on delete cascade,
  annonce_id uuid references public.listings (id) on delete set null,
  action text not null check (action in ('valider', 'refuser', 'correction', 'retirer', 'suspendre', 'reactiver', 'exclure')),
  motif text,
  cree_le timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
alter table public.moderation_actions force row level security;
create policy "modération : journal" on public.moderation_actions for select to authenticated using (prive.est_moderateur());
-- Écrit uniquement par les fonctions ci-dessous.

-- 4. Décider d'une annonce : valider, refuser, demander une correction, retirer (annonce en ligne signalée).
create or replace function public.moderer_annonce(p_annonce uuid, p_decision text, p_motif text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  l record;
  jours integer := (select s.duree_vie_annonce_jours from public.settings s where s.id = 1);
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  select id, auteur_id, statut into l from public.listings where id = p_annonce;
  if l.id is null then return false; end if;
  if p_decision = 'valider' then
    if l.statut <> 'verification' then return false; end if;
    update public.listings set statut = 'en_ligne', publie_le = now(), expire_le = now() + make_interval(days => jours),
      motif_refus = null, correction_demandee = false where id = p_annonce;
  elsif p_decision in ('refuser', 'correction') then
    if l.statut <> 'verification' then return false; end if;
    update public.listings set statut = 'refuse', motif_refus = nullif(btrim(coalesce(p_motif, '')), ''),
      correction_demandee = (p_decision = 'correction') where id = p_annonce;
  elsif p_decision = 'retirer' then
    if l.statut not in ('en_ligne', 'reserve', 'verification') then return false; end if;
    update public.listings set statut = 'refuse', motif_refus = nullif(btrim(coalesce(p_motif, '')), ''),
      correction_demandee = false where id = p_annonce;
  else
    raise exception 'Décision inconnue' using errcode = 'P0001';
  end if;
  insert into public.moderation_actions (moderateur_id, membre_id, annonce_id, action, motif)
  values ((select auth.uid()), l.auteur_id, p_annonce, p_decision, nullif(btrim(coalesce(p_motif, '')), ''));
  return true;
end $$;

-- 5. Suspendre, réactiver, exclure un membre (l'exclusion retire aussi ses annonces).
create or replace function public.moderer_membre(p_membre uuid, p_action text, p_motif text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  if p_membre = (select auth.uid()) then return false; end if;
  if exists (select 1 from public.profiles p where p.id = p_membre and p.role <> 'membre') and not prive.est_admin() then
    return false;
  end if;
  if p_action = 'suspendre' then
    update public.profiles set suspendu = true where id = p_membre;
  elsif p_action = 'reactiver' then
    update public.profiles set suspendu = false, exclu = false where id = p_membre;
  elsif p_action = 'exclure' then
    update public.profiles set suspendu = true, exclu = true where id = p_membre;
    update public.listings set statut = 'refuse', motif_refus = coalesce(nullif(btrim(coalesce(p_motif, '')), ''), 'Compte exclu')
    where auteur_id = p_membre and statut in ('verification', 'en_ligne', 'reserve');
  else
    raise exception 'Action inconnue' using errcode = 'P0001';
  end if;
  insert into public.moderation_actions (moderateur_id, membre_id, action, motif)
  values ((select auth.uid()), p_membre, p_action, nullif(btrim(coalesce(p_motif, '')), ''));
  return true;
end $$;

-- 6. Historique d'un membre pour la modération.
create or replace function public.historique_membre(p_membre uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  return json_build_object(
    'membre', (select json_build_object('id', p.id, 'nom_affiche', p.nom_affiche, 'avatar', p.avatar, 'wilaya_code', p.wilaya_code,
                 'ville', p.ville, 'suspendu', p.suspendu, 'exclu', p.exclu, 'role', p.role, 'cree_le', p.cree_le, 'est_pro', p.est_pro)
               from public.profiles p where p.id = p_membre),
    'annonces', (select count(*) from public.listings l where l.auteur_id = p_membre),
    'refusees', coalesce((select json_agg(json_build_object('id', l.id, 'titre', l.titre, 'motif', l.motif_refus, 'correction', l.correction_demandee)
                 order by l.modifie_le desc) from public.listings l where l.auteur_id = p_membre and l.statut = 'refuse'), '[]'::json),
    'signalements', coalesce((select json_agg(json_build_object('id', r.id, 'motif', r.motif, 'precisions', r.precisions, 'traitement', r.traitement,
                 'cree_le', r.cree_le, 'annonce_titre', l.titre) order by r.cree_le desc)
               from public.reports r left join public.listings l on l.id = r.annonce_id
               where r.membre_vise_id = p_membre or l.auteur_id = p_membre), '[]'::json),
    'actions', coalesce((select json_agg(json_build_object('action', a.action, 'motif', a.motif, 'cree_le', a.cree_le,
                 'annonce_id', a.annonce_id) order by a.cree_le desc)
               from public.moderation_actions a where a.membre_id = p_membre), '[]'::json)
  );
end $$;

-- 7. Signalements à traiter, avec ce qu'ils visent (pour la file de la modération).
create or replace function public.signalements_a_traiter()
returns table (id uuid, motif text, precisions text, cree_le timestamptz, annonce_id uuid, annonce_titre text,
  annonce_statut text, membre_id uuid, membre_nom text, membre_suspendu boolean, conversation_id uuid, nb_signalements bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  return query
  select r.id, r.motif, r.precisions, r.cree_le, r.annonce_id, l.titre, l.statut,
    coalesce(r.membre_vise_id, l.auteur_id), p.nom_affiche, p.suspendu, r.conversation_id,
    (select count(*) from public.reports r2 left join public.listings l2 on l2.id = r2.annonce_id
      where coalesce(r2.membre_vise_id, l2.auteur_id) = coalesce(r.membre_vise_id, l.auteur_id))
  from public.reports r
  left join public.listings l on l.id = r.annonce_id
  left join public.profiles p on p.id = coalesce(r.membre_vise_id, l.auteur_id)
  where r.traitement in ('a_traiter', 'en_cours')
  order by r.cree_le asc;
end $$;

revoke all on function public.moderer_annonce(uuid, text, text), public.moderer_membre(uuid, text, text),
  public.historique_membre(uuid), public.signalements_a_traiter() from public, anon;
grant execute on function public.moderer_annonce(uuid, text, text), public.moderer_membre(uuid, text, text),
  public.historique_membre(uuid), public.signalements_a_traiter() to authenticated;

-- 8. Notification au vendeur : annonce en ligne, refusée, à corriger ou retirée.
create or replace function prive.notifier_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  envois jsonb;
begin
  if not ((old.statut = 'verification' and new.statut in ('en_ligne', 'refuse'))
          or (old.statut in ('en_ligne', 'reserve') and new.statut = 'refuse')) then
    return new;
  end if;
  select jsonb_agg(jsonb_build_object(
      'to', t.jeton,
      'title', case
        when new.statut = 'en_ligne' then case when p.langue = 'ar' then 'إعلانك منشور' else 'Votre annonce est en ligne' end
        when new.correction_demandee then case when p.langue = 'ar' then 'مطلوب تصحيح إعلانك' else 'Correction demandée sur votre annonce' end
        else case when p.langue = 'ar' then 'لم يُقبل إعلانك' else 'Votre annonce n''a pas été acceptée' end end,
      'body', new.titre || coalesce(' · ' || new.motif_refus, ''),
      'sound', 'default',
      'data', jsonb_build_object('mes_annonces', true)))
    into envois
  from public.profiles p join public.push_tokens t on t.membre_id = p.id
  where p.id = new.auteur_id;
  if envois is not null then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return new;
exception when others then
  return new;
end $$;
create trigger notifier_decision after update of statut on public.listings
  for each row execute function prive.notifier_decision();

revoke all on function prive.notifier_decision() from public, anon, authenticated;
