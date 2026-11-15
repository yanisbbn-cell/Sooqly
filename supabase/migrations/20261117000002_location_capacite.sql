-- Sooqly – étape 6 (correction) : une location qui n'indique pas sa capacité (personnes) ou son nombre
-- de places n'est plus écartée de la recherche ; seule une capacité indiquée et trop petite l'écarte.
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
    and (p_min_personnes is null or (t.c ->> 'personnes') is null or (case when (t.c ->> 'personnes') ~ '^[0-9]+$' then (t.c ->> 'personnes')::int else 0 end) >= p_min_personnes)
    and (p_boite is null or t.c ->> 'boite' = p_boite)
    and (p_min_places is null or (t.c ->> 'places') is null or (case when (t.c ->> 'places') ~ '^[0-9]+$' then (t.c ->> 'places')::int else 0 end) >= p_min_places)
  order by t.total;
$$;
grant execute on function public.chercher_locations(text, date, date, text, smallint, text[], int, text, int, bigint) to anon, authenticated;
