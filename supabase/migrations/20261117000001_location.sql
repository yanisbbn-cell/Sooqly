-- Sooqly – étape 6 : la location (logements et véhicules).

-- 1. Deux caractéristiques demandées seulement pour une location (« location »: true) :
--    capacité d'un logement, type de véhicule. Sans elles, la recherche façon Booking ne pourrait rien trouver.
update public.categories
  set criteres = criteres || '[{"cle":"personnes","fr":"Nombre de personnes (capacité)","ar":"عدد الأشخاص (السعة)","type":"nombre","location":true}]'::jsonb
  where cle = 'immobilier';
update public.categories
  set criteres = '[{"cle":"type_vehicule","fr":"Type de véhicule","ar":"نوع المركبة","type":"choix","location":true,"options":[{"v":"Citadine","fr":"Citadine","ar":"سيارة صغيرة"},{"v":"Berline","fr":"Berline","ar":"سيدان"},{"v":"SUV","fr":"SUV","ar":"دفع رباعي"},{"v":"Utilitaire","fr":"Utilitaire","ar":"نفعية"}]}]'::jsonb || criteres
  where cle = 'vehicules';

-- 2. Une location n'existe que pour l'immobilier et les véhicules ; son prix est vérifié tarif par tarif.
create or replace function prive.proteger_annonce()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
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
     or new.expire_le is distinct from old.expire_le then
    raise exception 'Champ réservé à la modération';
  end if;
  if new.statut is distinct from old.statut and not (
       (old.statut = 'en_ligne' and new.statut in ('reserve', 'vendu', 'loue'))
    or (old.statut = 'reserve' and new.statut in ('en_ligne', 'vendu', 'loue'))
    or (old.statut in ('refuse', 'expire') and new.statut = 'verification')
  ) then
    raise exception 'Changement de statut non autorisé';
  end if;
  return new;
end $$;

-- 3. Tarifs : unité permise selon la catégorie, prix dans la fourchette de l'unité.
create or replace function prive.verifier_tarif()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l record;
  bornes jsonb;
begin
  select a.type, a.categorie, c.fourchettes_prix into l
    from public.listings a join public.categories c on c.cle = a.categorie where a.id = new.annonce_id;
  if l.type is distinct from 'location' then
    raise exception 'Tarif réservé aux locations' using errcode = 'P0001';
  end if;
  if (l.categorie = 'immobilier' and new.unite = 'jour') or (l.categorie = 'vehicules' and new.unite = 'nuit') then
    raise exception 'Unité de tarif incompatible' using errcode = 'P0001';
  end if;
  bornes := l.fourchettes_prix -> replace(new.unite, '_', ' ');
  if bornes is not null and (new.prix_da < (bornes ->> 0)::bigint or new.prix_da > (bornes ->> 1)::bigint) then
    raise exception 'Tarif incohérent' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger verifier_tarif before insert or update on public.listing_rates
  for each row execute function prive.verifier_tarif();

-- 4. Recherche façon Booking : total pour toute la période, seulement les biens libres avec un tarif adapté.
--    Durée « dates » : on prend le plus petit tarif du bien (nuit ou jour, sinon semaine, sinon mois) :
--      nuits = jours d'écart ; jours = écart + 1 ; semaines = jours / 7 et mois = jours / 30, arrondis au-dessus.
--    Durée 1 mois, 6 mois, 1 an : le tarif de cette durée, sinon le tarif mensuel × nombre de mois.
create or replace function public.chercher_locations(
  p_genre text,               -- 'logement' ou 'vehicule'
  p_debut date,
  p_fin date,                 -- seulement pour p_duree = 'dates'
  p_duree text,               -- 'dates', '1_mois', '6_mois', '1_an'
  p_wilaya smallint default null,
  p_types text[] default null,
  p_min_personnes int default null,
  p_boite text default null,
  p_min_places int default null,
  p_budget bigint default null
)
returns table (annonce_id uuid, total bigint, unite text, nombre int, fin date)
language sql stable set search_path = '' as $$
  with params as (
    select
      case p_genre when 'logement' then 'immobilier' else 'vehicules' end as cat,
      case p_duree when '1_mois' then 1 when '6_mois' then 6 when '1_an' then 12 else 0 end as mois,
      case when p_duree = 'dates' then p_fin
           else (p_debut + (case p_duree when '1_mois' then 1 when '6_mois' then 6 else 12 end) * interval '1 month' - interval '1 day')::date
      end as fin_periode
  ),
  candidates as (
    select l.id, l.caracteristiques c, p.mois, p.fin_periode
    from public.listings l, params p
    where l.type = 'location' and l.statut = 'en_ligne' and l.categorie = p.cat
      and (p_wilaya is null or l.wilaya_code = p_wilaya)
      and p.fin_periode >= p_debut
      and exists (select 1 from public.availability a where a.annonce_id = l.id and a.debut <= p_debut and a.fin >= p.fin_periode)
      and (p_types is null or cardinality(p_types) = 0
           or (case p_genre when 'logement' then l.caracteristiques ->> 'type' else l.caracteristiques ->> 'type_vehicule' end) = any (p_types))
  ),
  totaux as (
    select c.id, c.c, c.fin_periode,
      case
        when c.mois > 0 then coalesce(
          (select r.prix_da from public.listing_rates r where r.annonce_id = c.id and r.unite = (case c.mois when 1 then 'mois' when 6 then '6_mois' else 'an' end)),
          (select r.prix_da * c.mois from public.listing_rates r where r.annonce_id = c.id and r.unite = 'mois'))
        else (select r.prix_da * case r.unite
                 when 'nuit' then (p_fin - p_debut)
                 when 'jour' then (p_fin - p_debut + 1)
                 when 'semaine' then ceil((p_fin - p_debut + 1) / 7.0)::int
                 else ceil((p_fin - p_debut + 1) / 30.0)::int end
              from public.listing_rates r where r.annonce_id = c.id and r.unite in ('nuit', 'jour', 'semaine', 'mois')
              order by array_position(array['nuit', 'jour', 'semaine', 'mois'], r.unite) limit 1)
      end as total,
      case when c.mois > 0 then
        case when exists (select 1 from public.listing_rates r where r.annonce_id = c.id and r.unite = (case c.mois when 1 then 'mois' when 6 then '6_mois' else 'an' end))
             then (case c.mois when 1 then 'mois' when 6 then '6_mois' else 'an' end) else 'mois' end
      else (select r.unite from public.listing_rates r where r.annonce_id = c.id and r.unite in ('nuit', 'jour', 'semaine', 'mois')
            order by array_position(array['nuit', 'jour', 'semaine', 'mois'], r.unite) limit 1)
      end as unite,
      c.mois
    from candidates c
  )
  select t.id, t.total::bigint, t.unite,
    case
      when t.mois > 0 then (case when t.unite = 'mois' then t.mois else 1 end)
      when t.unite = 'nuit' then (p_fin - p_debut)
      when t.unite = 'jour' then (p_fin - p_debut + 1)
      when t.unite = 'semaine' then ceil((p_fin - p_debut + 1) / 7.0)::int
      else ceil((p_fin - p_debut + 1) / 30.0)::int
    end,
    t.fin_periode
  from totaux t
  where t.total is not null and t.total > 0
    and (p_budget is null or t.total <= p_budget)
    and (p_min_personnes is null or (case when (t.c ->> 'personnes') ~ '^[0-9]+$' then (t.c ->> 'personnes')::int else 0 end) >= p_min_personnes)
    and (p_boite is null or t.c ->> 'boite' = p_boite)
    and (p_min_places is null or (case when (t.c ->> 'places') ~ '^[0-9]+$' then (t.c ->> 'places')::int else 0 end) >= p_min_places)
  order by t.total;
$$;
grant execute on function public.chercher_locations(text, date, date, text, smallint, text[], int, text, int, bigint) to anon, authenticated;
