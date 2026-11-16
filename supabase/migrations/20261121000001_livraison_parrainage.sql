-- Sooqly – étape 11 : remise et livraison, prix ferme ou négociable, échange, filtres, parrainage.

-- 1. Remise et livraison : seulement pour les objets (hors immobilier, véhicules, services, locations).
--    L'échange concerne les ventes ; « prix ferme » n'a pas de sens pour un don.
create or replace function prive.normaliser_options()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  objet boolean := new.type in ('vente', 'don') and new.categorie not in ('immobilier', 'vehicules', 'services');
begin
  if not objet then
    new.remise_main_propre := false;
    new.livraison_wilaya := false;
    new.envoi_algerie := false;
  end if;
  if new.type <> 'vente' then new.echange_accepte := false; end if;
  if new.type = 'don' then new.prix_ferme := true; end if;
  return new;
end $$;
create trigger normaliser_options before insert or update on public.listings
  for each row execute function prive.normaliser_options();

-- 2. Filtre « Vendeurs validés uniquement » : la liste des membres qui ont le badge.
create or replace function public.tous_vendeurs_valides()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select r.cible_id from public.ratings r
  where r.role = 'acheteur' and r.note = 5
  group by r.cible_id
  having count(*) >= (select s.seuil_badge from public.settings s where s.id = 1);
$$;
revoke all on function public.tous_vendeurs_valides() from public;
grant execute on function public.tous_vendeurs_valides() to anon, authenticated;

-- 3. Alertes : les deux nouveaux filtres (« livrable » avec la wilaya du membre, « valides »).
create or replace function prive.options_correspondent(f jsonb, l public.listings)
returns boolean language sql stable security definer set search_path = '' as $$
  select (coalesce((f ->> 'livrable')::boolean, false) = false
          or l.envoi_algerie
          or (l.livraison_wilaya and l.wilaya_code = (f ->> 'wilayaLivraison')::smallint))
     and (coalesce((f ->> 'validesSeulement')::boolean, false) = false
          or prive.ventes_5_etoiles(l.auteur_id) >= (select s.seuil_badge from public.settings s where s.id = 1));
$$;

-- 4. Parrainage : code vérifié par le serveur, juste après l'inscription.
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

create or replace function public.utiliser_code_parrainage(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  parrain uuid;
  n integer;
begin
  select p.id into parrain from public.profiles p where p.code_parrainage = upper(btrim(p_code));
  if parrain is null or parrain = (select auth.uid()) then return false; end if;
  perform set_config('sooqly.parrainage', 'oui', true);
  update public.profiles set parrain_id = parrain
  where id = (select auth.uid()) and parrain_id is null and cree_le > now() - interval '1 day';
  get diagnostics n = row_count;
  perform set_config('sooqly.parrainage', '', true);
  return n > 0;
end $$;

create or replace function public.nombre_filleuls()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.profiles p where p.parrain_id = (select auth.uid());
$$;
revoke all on function public.utiliser_code_parrainage(text), public.nombre_filleuls() from public;
grant execute on function public.utiliser_code_parrainage(text), public.nombre_filleuls() to authenticated;
revoke all on function prive.normaliser_options(), prive.options_correspondent(jsonb, public.listings) from public, anon, authenticated;

-- 5. Alertes : la comparaison tient compte des nouveaux filtres.
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
  if not prive.options_correspondent(f, l) then return false; end if;
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
