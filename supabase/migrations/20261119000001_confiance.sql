-- Étape 9 : confiance (signaler, bloquer, conclure une vente, noter, badge « Vendeur validé »).

-- 1. Déclarer une vente : l'acheteur doit avoir discuté de cette annonce avec le vendeur.
--    L'annonce passe alors « vendue » (ou « louée » pour une location).
create or replace function prive.verifier_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type text;
begin
  if (select auth.uid()) is not null then
    if new.acheteur_id is not null and not exists (
      select 1 from public.conversations c
      where c.annonce_id = new.annonce_id and c.acheteur_id = new.acheteur_id and c.vendeur_id = new.vendeur_id
    ) then
      raise exception 'Cet acheteur n''a pas discuté de cette annonce' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.transactions t where t.annonce_id = new.annonce_id and t.statut = 'conclue') then
      raise exception 'Cette annonce a déjà été conclue' using errcode = 'P0001';
    end if;
    new.date := now();
    new.statut := 'conclue';
  end if;
  select l.type into v_type from public.listings l where l.id = new.annonce_id;
  update public.listings set statut = case when v_type = 'location' then 'loue' else 'vendu' end
  where id = new.annonce_id and statut in ('en_ligne', 'reserve');
  return new;
end $$;
create trigger verifier_transaction before insert on public.transactions
  for each row execute function prive.verifier_transaction();

-- 2. Badge « Vendeur validé » : N ventes notées 5 étoiles par des acheteurs (N = settings.seuil_badge).
create or replace function prive.ventes_5_etoiles(p_membre uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.ratings r where r.cible_id = p_membre and r.role = 'acheteur' and r.note = 5;
$$;

create or replace function public.vendeurs_valides(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.cible_id from public.ratings r
  where r.cible_id = any (p_ids) and r.role = 'acheteur' and r.note = 5
  group by r.cible_id
  having count(*) >= (select s.seuil_badge from public.settings s where s.id = 1);
$$;

-- 3. Profil public : moyenne, nombre d'avis, notes par critère, progression du badge.
create or replace function public.profil_membre(p_membre uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'moyenne', (select round(avg(r.note)::numeric, 1) from public.ratings r where r.cible_id = p_membre),
    'nb_avis', (select count(*) from public.ratings r where r.cible_id = p_membre),
    'ventes_5', prive.ventes_5_etoiles(p_membre),
    'seuil', (select s.seuil_badge from public.settings s where s.id = 1),
    'ventes', (select count(*) from public.transactions t where t.vendeur_id = p_membre and t.statut = 'conclue'),
    'comme_vendeur', (select json_build_object('nb', count(*), 'c1', round(avg(critere_1)::numeric, 1),
        'c2', round(avg(critere_2)::numeric, 1), 'c3', round(avg(critere_3)::numeric, 1))
      from public.ratings r where r.cible_id = p_membre and r.role = 'acheteur'),
    'comme_acheteur', (select json_build_object('nb', count(*), 'c1', round(avg(critere_1)::numeric, 1),
        'c2', round(avg(critere_2)::numeric, 1), 'c3', round(avg(critere_3)::numeric, 1))
      from public.ratings r where r.cible_id = p_membre and r.role = 'vendeur')
  );
$$;

-- 4. Transactions à noter (et notes encore modifiables pendant 48 h).
create or replace function public.transactions_a_noter()
returns table (
  transaction_id uuid, annonce_id uuid, titre text, type text, date timestamptz,
  mon_role text, autre_id uuid, autre_nom text, autre_avatar smallint,
  note_id uuid, note smallint, critere_1 smallint, critere_2 smallint, critere_3 smallint, note_le timestamptz
) language sql stable security definer set search_path = '' as $$
  select t.id, t.annonce_id, l.titre, l.type, t.date,
    case when t.acheteur_id = (select auth.uid()) then 'acheteur' else 'vendeur' end,
    p.id, p.nom_affiche, p.avatar,
    r.id, r.note, r.critere_1, r.critere_2, r.critere_3, r.cree_le
  from public.transactions t
  join public.listings l on l.id = t.annonce_id
  join public.profiles p on p.id = case when t.acheteur_id = (select auth.uid()) then t.vendeur_id else t.acheteur_id end
  left join public.ratings r on r.transaction_id = t.id and r.auteur_id = (select auth.uid())
  where (select auth.uid()) in (t.acheteur_id, t.vendeur_id) and t.acheteur_id is not null and t.statut = 'conclue'
    and (r.id is null or r.cree_le > now() - interval '48 hours')
  order by t.date desc;
$$;

-- 5. Membres bloqués (avec leur nom, pour la liste « Membres bloqués »).
create or replace function public.mes_blocages()
returns table (bloque_id uuid, nom_affiche text, avatar smallint, cree_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.bloque_id, p.nom_affiche, p.avatar, b.cree_le
  from public.blocks b join public.profiles p on p.id = b.bloque_id
  where b.membre_id = (select auth.uid())
  order by b.cree_le desc;
$$;

revoke all on function public.vendeurs_valides(uuid[]), public.profil_membre(uuid),
  public.transactions_a_noter(), public.mes_blocages() from public;
grant execute on function public.vendeurs_valides(uuid[]), public.profil_membre(uuid) to anon, authenticated;
grant execute on function public.transactions_a_noter(), public.mes_blocages() to authenticated;
revoke all on function prive.verifier_transaction(), prive.ventes_5_etoiles(uuid) from public;
grant execute on function prive.ventes_5_etoiles(uuid) to anon, authenticated;

-- 6. Signalement : un même membre ne signale pas deux fois la même chose tant que ce n'est pas traité.
create unique index reports_unique_en_attente on public.reports (auteur_id, coalesce(annonce_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(membre_vise_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where traitement in ('a_traiter', 'en_cours');
