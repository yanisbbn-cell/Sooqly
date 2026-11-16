-- Sooqly – étape 13 : corrections de la revue de sécurité, et « Supprimer mon compte ».

-- 1. Fonctions propres à un membre connecté : plus appelables par un visiteur.
revoke execute on function public.mes_blocages(), public.nombre_filleuls(), public.stats_mes_annonces(),
  public.transactions_a_noter(), public.utiliser_code_parrainage(text), public.mes_discussions(), public.nombre_non_lus()
  from anon;

-- 2. Profils : le public ne voit que les colonnes utiles (pas le code de parrainage, le parrain, la langue,
--    ni les dates d'acceptation de la charte).
revoke select on public.profiles from anon, authenticated;
grant select (id, nom_affiche, wilaya_code, ville, telephone_verifie, avatar, est_pro, activite_pro, nom_commercial,
  role, suspendu, exclu, cree_le) on public.profiles to anon, authenticated;

create or replace function public.mon_code_parrainage()
returns text language sql stable security definer set search_path = '' as $$
  select p.code_parrainage from public.profiles p where p.id = (select auth.uid());
$$;
create or replace function public.code_parrainage_existe(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.code_parrainage = upper(btrim(p_code)));
$$;
revoke all on function public.mon_code_parrainage(), public.code_parrainage_existe(text) from public, anon;
grant execute on function public.mon_code_parrainage() to authenticated;
grant execute on function public.code_parrainage_existe(text) to anon, authenticated;

-- 3. Limites anti-abus : pas d'envois en rafale (messages, discussions, signalements, annonces, documents).
create or replace function prive.limiter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  maximum integer := tg_argv[0]::integer;
  duree interval := tg_argv[1]::interval;
  colonne text := tg_argv[2];
  membre uuid := (select auth.uid());
  n integer;
begin
  if membre is null or prive.est_moderateur() then return new; end if;
  execute format('select count(*) from %I.%I where %I = $1 and cree_le > now() - $2', tg_table_schema, tg_table_name, colonne)
    into n using membre, duree;
  if n >= maximum then
    raise exception 'Trop d''envois en peu de temps : réessayez plus tard' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger limiter_messages before insert on public.messages
  for each row execute function prive.limiter('30', '1 minute', 'auteur_id');
create trigger limiter_conversations before insert on public.conversations
  for each row execute function prive.limiter('30', '1 hour', 'acheteur_id');
create trigger limiter_signalements before insert on public.reports
  for each row execute function prive.limiter('20', '1 day', 'auteur_id');
create trigger limiter_annonces before insert on public.listings
  for each row execute function prive.limiter('20', '1 day', 'auteur_id');
create trigger limiter_documents before insert on public.private_documents
  for each row execute function prive.limiter('10', '1 day', 'expediteur_id');

-- 4. Messages vocaux : seulement des fichiers audio.
update storage.buckets set allowed_mime_types = array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav']
where id = 'vocaux';

-- 5. Effacer des fichiers (photos, vocaux, permis) avec la clé de service rangée dans le coffre-fort.
create or replace function prive.effacer_fichiers(p_seau text, p_chemins text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  cle text;
  i integer := 1;
begin
  if coalesce(array_length(p_chemins, 1), 0) = 0 then return; end if;
  select decrypted_secret into cle from vault.decrypted_secrets where name = 'cle_service_stockage';
  if cle is null then
    raise warning 'Clé de service absente du coffre-fort : fichiers non effacés';
    return;
  end if;
  -- Par paquets de 500 fichiers.
  while i <= array_length(p_chemins, 1) loop
    perform net.http_delete(
      url := 'https://asaltwruyylfoktdnnkw.supabase.co/storage/v1/object/' || p_seau,
      headers := jsonb_build_object('apikey', cle, 'Authorization', 'Bearer ' || cle, 'Content-Type', 'application/json'),
      body := jsonb_build_object('prefixes', to_jsonb(p_chemins[i:i + 499]))
    );
    i := i + 500;
  end loop;
end $$;

-- 6. Chaque nuit : photos jamais rattachées à une annonce (ou d'annonces supprimées), vocaux de discussions
--    supprimées, permis sans document. Une photo déposée hors annonce n'échappe donc pas à la modération.
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
end $$;
select cron.schedule('nettoyer-fichiers-orphelins', '41 3 * * *', 'select prive.nettoyer_fichiers_orphelins()');

-- 7. Numéros exclus : on garde seulement une empreinte (SHA-256), pour empêcher un retour après suppression du compte.
create table prive.numeros_exclus (
  empreinte text primary key,
  cree_le timestamptz not null default now()
);
revoke all on prive.numeros_exclus from public, anon, authenticated;

create or replace function prive.retenir_exclusion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.exclu and not old.exclu then
    insert into prive.numeros_exclus (empreinte)
    select encode(extensions.digest(u.phone, 'sha256'), 'hex') from auth.users u where u.id = new.id and coalesce(u.phone, '') <> ''
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger retenir_exclusion after update of exclu on public.profiles
  for each row execute function prive.retenir_exclusion();

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

-- 8. Notes : une note donnée par un membre qui supprime son compte reste visible (« Ancien membre »).
alter table public.ratings alter column auteur_id drop not null;
alter table public.ratings alter column transaction_id drop not null;
alter table public.ratings drop constraint ratings_auteur_id_fkey;
alter table public.ratings add constraint ratings_auteur_id_fkey foreign key (auteur_id) references public.profiles (id) on delete set null;
alter table public.ratings drop constraint ratings_transaction_id_fkey;
alter table public.ratings add constraint ratings_transaction_id_fkey foreign key (transaction_id) references public.transactions (id) on delete set null;

create or replace function prive.proteger_note()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or coalesce(current_setting('sooqly.suppression', true), '') = 'oui' then return new; end if;
  if (new.transaction_id, new.auteur_id, new.cible_id, new.role, new.cree_le)
     is distinct from (old.transaction_id, old.auteur_id, old.cible_id, old.role, old.cree_le) then
    raise exception 'Seules les étoiles peuvent être corrigées';
  end if;
  return new;
end $$;

-- 9. « Supprimer mon compte » : profil, annonces, photos, messages et vocaux, documents, favoris, alertes.
create or replace function public.supprimer_mon_compte()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := (select auth.uid());
  photos text[];
  vocaux text[];
  documents text[];
begin
  if moi is null then return false; end if;
  -- L'administrateur doit d'abord confier son rôle (sinon plus personne ne gère Sooqly).
  if exists (select 1 from public.profiles p where p.id = moi and p.role = 'admin') then return false; end if;

  photos := array(select o.name from storage.objects o where o.bucket_id = 'photos-annonces' and o.name like moi::text || '/%');
  vocaux := array(select o.name from storage.objects o
                  join public.conversations c on o.name like c.id::text || '/%'
                  where o.bucket_id = 'vocaux' and moi in (c.acheteur_id, c.vendeur_id));
  documents := array(select d.fichier from public.private_documents d where moi in (d.expediteur_id, d.destinataire_id));

  perform set_config('sooqly.suppression', 'oui', true);
  -- Un membre exclu garde son exclusion (empreinte du numéro) même après suppression.
  delete from auth.users where id = moi;
  perform set_config('sooqly.suppression', '', true);

  perform prive.effacer_fichiers('photos-annonces', photos);
  perform prive.effacer_fichiers('vocaux', vocaux);
  perform prive.effacer_fichiers('documents', documents);
  return true;
end $$;
revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

revoke all on function prive.limiter(), prive.effacer_fichiers(text, text[]), prive.nettoyer_fichiers_orphelins(),
  prive.retenir_exclusion() from public, anon, authenticated;
