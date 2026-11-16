-- Sooqly – bannière de la Page Pro choisie par le professionnel (demande de Yanis).
-- Deux façons : une photo d'une de ses annonces (déjà vérifiée, en ligne tout de suite),
-- ou une photo du téléphone (détecteur sur l'appareil, puis vérification par un modérateur).

alter table public.profiles
  add column banniere text,            -- chemin « seau/fichier » de la bannière affichée
  add column banniere_proposee text;   -- photo du téléphone en attente de vérification

grant select (banniere) on public.profiles to anon, authenticated;

create or replace function prive.proteger_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a_un_telephone boolean;
begin
  -- Les opérations côté serveur (sans utilisateur connecté, ou suppression d'un compte) ne sont pas limitées.
  if (select auth.uid()) is null or coalesce(current_setting('sooqly.suppression', true), '') = 'oui' then return new; end if;

  if tg_op = 'INSERT' then
    if prive.est_admin() then return new; end if;

    select coalesce(u.phone, '') <> '' into a_un_telephone from auth.users u where u.id = new.id;
    if not coalesce(a_un_telephone, false) then
      raise exception 'Numéro de téléphone obligatoire : inscription impossible' using errcode = 'P0001';
    end if;
    -- Un numéro exclu ne peut pas revenir (empreinte du numéro, jamais le numéro lui-même).
    if exists (select 1 from prive.numeros_exclus e join auth.users u on u.id = new.id
               where e.empreinte = encode(extensions.digest(coalesce(u.phone, ''), 'sha256'), 'hex')) then
      raise exception 'Ce numéro ne peut plus s''inscrire sur Sooqly' using errcode = 'P0001';
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
    new.banniere := null;
    new.banniere_proposee := null;
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
  if (new.banniere is distinct from old.banniere or new.banniere_proposee is distinct from old.banniere_proposee)
     and coalesce(current_setting('sooqly.banniere', true), '') <> 'oui' and not prive.est_moderateur() then
    raise exception 'La bannière se change depuis la Page Pro' using errcode = 'P0001';
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bannieres', 'bannieres', true, 3145728, array['image/jpeg'])
on conflict (id) do nothing;
create policy "bannières : déposer dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'bannieres' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bannières : supprimer les siennes" on storage.objects for delete to authenticated
  using (bucket_id = 'bannieres' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- A. Une photo d'une de ses annonces en ligne, déjà acceptée par la modération.
create or replace function public.choisir_banniere_annonce(p_fichier text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.est_pro) then return false; end if;
  if not exists (
    select 1 from public.listing_photos ph join public.listings l on l.id = ph.annonce_id
    where ph.fichier = p_fichier and ph.decision_moderation = 'acceptee'
      and l.auteur_id = (select auth.uid()) and l.statut in ('en_ligne', 'reserve')
  ) then
    return false;
  end if;
  perform set_config('sooqly.banniere', 'oui', true);
  update public.profiles set banniere = 'photos-annonces/' || p_fichier where id = (select auth.uid());
  perform set_config('sooqly.banniere', '', true);
  return true;
end $$;

-- B. Une photo du téléphone : en attente de vérification.
create or replace function public.proposer_banniere(p_fichier text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.est_pro) then return false; end if;
  if p_fichier not like (select auth.uid())::text || '/%'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'bannieres' and o.name = p_fichier) then
    return false;
  end if;
  perform set_config('sooqly.banniere', 'oui', true);
  update public.profiles set banniere_proposee = p_fichier where id = (select auth.uid());
  perform set_config('sooqly.banniere', '', true);
  return true;
end $$;

-- Revenir à la bannière dessinée (et annuler une proposition en attente).
create or replace function public.retirer_banniere()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('sooqly.banniere', 'oui', true);
  update public.profiles set banniere = null, banniere_proposee = null where id = (select auth.uid());
  perform set_config('sooqly.banniere', '', true);
  return true;
end $$;

create or replace function public.ma_banniere()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('banniere', p.banniere, 'proposee', p.banniere_proposee, 'est_pro', p.est_pro)
  from public.profiles p where p.id = (select auth.uid());
$$;

-- Modération : bannières proposées à vérifier, puis accepter ou refuser.
create or replace function public.bannieres_a_verifier()
returns table (membre_id uuid, nom text, fichier text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  return query select p.id, coalesce(p.nom_commercial, p.nom_affiche), p.banniere_proposee
    from public.profiles p where p.banniere_proposee is not null order by p.nom_affiche;
end $$;

create or replace function public.decider_banniere(p_membre uuid, p_accepter boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  f text;
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  select banniere_proposee into f from public.profiles where id = p_membre;
  if f is null then return false; end if;
  update public.profiles
    set banniere = case when p_accepter then 'bannieres/' || f else banniere end, banniere_proposee = null
  where id = p_membre;
  if not p_accepter then perform prive.effacer_fichiers('bannieres', array[f]); end if;
  return true;
end $$;

revoke all on function public.choisir_banniere_annonce(text), public.proposer_banniere(text), public.retirer_banniere(),
  public.ma_banniere(), public.bannieres_a_verifier(), public.decider_banniere(uuid, boolean) from public, anon;
grant execute on function public.choisir_banniere_annonce(text), public.proposer_banniere(text), public.retirer_banniere(),
  public.ma_banniere(), public.bannieres_a_verifier(), public.decider_banniere(uuid, boolean) to authenticated;

-- Fichiers de bannières qui ne servent plus : effacés avec les autres fichiers orphelins chaque nuit.
create or replace function prive.nettoyer_fichiers_orphelins()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform prive.effacer_fichiers('photos-annonces', array(
    select o.name from storage.objects o
    where o.bucket_id = 'photos-annonces' and o.created_at < now() - interval '1 day'
      and not exists (select 1 from public.listing_photos p where p.fichier = o.name)));
  perform prive.effacer_fichiers('vocaux', array(
    select o.name from storage.objects o
    where o.bucket_id = 'vocaux' and o.created_at < now() - interval '1 day'
      and not exists (select 1 from public.messages m where m.fichier = o.name)));
  perform prive.effacer_fichiers('documents', array(
    select o.name from storage.objects o
    where o.bucket_id = 'documents' and o.created_at < now() - interval '1 day'
      and not exists (select 1 from public.private_documents d where d.fichier = o.name)));
  perform prive.effacer_fichiers('bannieres', array(
    select o.name from storage.objects o
    where o.bucket_id = 'bannieres' and o.created_at < now() - interval '1 day'
      and not exists (select 1 from public.profiles p
                      where p.banniere_proposee = o.name or p.banniere = 'bannieres/' || o.name)));
end $$;
