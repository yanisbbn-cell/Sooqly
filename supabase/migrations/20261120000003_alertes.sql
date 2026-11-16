-- Sooqly – étape 10, morceau 3 : alertes de recherche.
-- Les filtres sont ceux de l'écran de recherche (voir src/lib/recherche.tsx), enregistrés tels quels,
-- plus les mots déjà normalisés par l'appli (« mots », « mots_criteres ») pour comparer comme la recherche.

-- 1. Une annonce correspond-elle aux filtres d'une alerte ? (mêmes règles que la recherche de l'appli)
create or replace function prive.annonce_correspond(f jsonb, l public.listings, auteur_pro boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  m text;
  cle text;
  v jsonb;
begin
  for m in select jsonb_array_elements_text(coalesce(f -> 'mots', '[]'::jsonb)) loop
    if l.texte_recherche not like '%' || m || '%' then return false; end if;
  end loop;
  if f ->> 'categorie' is not null and l.categorie <> f ->> 'categorie' then return false; end if;
  if jsonb_array_length(coalesce(f -> 'sousCategories', '[]'::jsonb)) > 0
     and (l.sous_categorie_id is null or not (f -> 'sousCategories') @> to_jsonb(l.sous_categorie_id)) then
    return false;
  end if;
  if (f ->> 'wilaya') is not null and l.wilaya_code <> (f ->> 'wilaya')::smallint then return false; end if;
  if (f ->> 'prixMin') is not null and l.prix_da < (f ->> 'prixMin')::bigint then return false; end if;
  if (f ->> 'prixMax') is not null and l.prix_da > (f ->> 'prixMax')::bigint then return false; end if;
  if coalesce(f ->> 'type', 'tous') <> 'tous' and l.type <> f ->> 'type' then return false; end if;
  if jsonb_array_length(coalesce(f -> 'etats', '[]'::jsonb)) > 0
     and (l.etat is null or not (f -> 'etats') @> to_jsonb(l.etat)) then
    return false;
  end if;
  if coalesce(f ->> 'annonceur', 'tous') = 'professionnels' and not auteur_pro then return false; end if;
  if coalesce(f ->> 'annonceur', 'tous') = 'particuliers' and auteur_pro then return false; end if;

  -- Critères de la catégorie : seulement si une catégorie est choisie (comme dans l'appli).
  if f ->> 'categorie' is not null then
    for cle, v in select * from jsonb_each(coalesce(f -> 'criteres', '{}'::jsonb)) loop
      if jsonb_typeof(v) = 'array' then
        if jsonb_array_length(v) > 0 and not v @> to_jsonb(l.caracteristiques ->> cle) then return false; end if;
      elsif jsonb_typeof(v) = 'string' then
        m := f -> 'mots_criteres' ->> cle;
        if m is not null and m <> '' and l.texte_recherche not like '%' || m || '%' then return false; end if;
      elsif jsonb_typeof(v) = 'object' then
        if (v ->> 'min') is not null and (jsonb_typeof(l.caracteristiques -> cle) is distinct from 'number'
            or (l.caracteristiques ->> cle)::numeric < (v ->> 'min')::numeric) then
          return false;
        end if;
        if (v ->> 'max') is not null and (jsonb_typeof(l.caracteristiques -> cle) is distinct from 'number'
            or (l.caracteristiques ->> cle)::numeric > (v ->> 'max')::numeric) then
          return false;
        end if;
      end if;
    end loop;
  end if;
  return true;
end $$;

-- 2. À la première mise en ligne d'une annonce : compteur « nouvelles annonces » et notification.
create or replace function prive.prevenir_alertes()
returns trigger language plpgsql security definer set search_path = '' as $$
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
end $$;
create trigger prevenir_alertes after update of statut on public.listings
  for each row execute function prive.prevenir_alertes();

-- 3. Au plus 20 alertes par membre ; les compteurs sont tenus par le serveur (le membre peut seulement les remettre à zéro).
create or replace function prive.proteger_alerte()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Côté serveur (validation d'une annonce par un modérateur) : le compteur avance librement.
  if (select auth.uid()) is null or (tg_op = 'UPDATE' and (select auth.uid()) <> old.membre_id) then return new; end if;
  if tg_op = 'INSERT' then
    if (select count(*) from public.search_alerts a where a.membre_id = new.membre_id) >= 20 then
      raise exception 'Vous avez déjà 20 alertes' using errcode = 'P0001';
    end if;
    if jsonb_typeof(new.filtres) <> 'object' then raise exception 'Filtres invalides' using errcode = 'P0001'; end if;
    new.nouvelles_annonces := 0;
    new.dernier_envoi := null;
    new.cree_le := now();
  else
    if new.nouvelles_annonces <> 0 then new.nouvelles_annonces := old.nouvelles_annonces; end if;
    new.dernier_envoi := old.dernier_envoi;
    new.cree_le := old.cree_le;
    new.membre_id := old.membre_id;
  end if;
  return new;
end $$;
create trigger proteger_alerte before insert or update on public.search_alerts
  for each row execute function prive.proteger_alerte();

revoke all on function prive.annonce_correspond(jsonb, public.listings, boolean), prive.prevenir_alertes(), prive.proteger_alerte()
  from public, anon, authenticated;
