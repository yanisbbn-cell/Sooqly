-- Sooqly – étape 8 : permis de conduire (location de véhicules).
-- Le locataire envoie une photo de son permis au loueur. La photo est rangée dans un seau PRIVÉ :
-- seul le DESTINATAIRE (le loueur) peut l'ouvrir ; même l'expéditeur ne voit ensuite que le statut.
-- Chaque jour, les permis dont la date d'effacement est passée sont supprimés (photo comprise).

-- 1. Seau privé « documents » : chemin = <destinataire>/<expéditeur>/<fichier>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 4194304, array['image/jpeg'])
on conflict (id) do nothing;

create policy "documents : le locataire dépose" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "documents : seul le destinataire ouvre" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. Règles d'un envoi de permis : annonce de location de véhicule qui exige le permis,
--    destinataire = le loueur, fichier rangé à son nom, date d'effacement dans moins d'un an.
create or replace function prive.verifier_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.listings l
      where l.id = new.annonce_id and l.auteur_id = new.destinataire_id and l.type = 'location'
        and l.categorie = 'vehicules' and l.permis_exige and l.statut in ('en_ligne', 'reserve')
    ) then
      raise exception 'Cette annonce ne demande pas de permis' using errcode = 'P0001';
    end if;
    if new.expediteur_id = new.destinataire_id then
      raise exception 'Envoi à soi-même impossible' using errcode = 'P0001';
    end if;
    if new.fichier not like new.destinataire_id::text || '/' || new.expediteur_id::text || '/%' then
      raise exception 'Fichier mal rangé' using errcode = 'P0001';
    end if;
    if new.efface_le <= now() or new.efface_le > now() + interval '1 year' then
      raise exception 'Date d''effacement invalide' using errcode = 'P0001';
    end if;
    new.statut := 'en_attente';
    new.cree_le := now();
  end if;
  return new;
end $$;
create trigger verifier_document before insert on public.private_documents
  for each row execute function prive.verifier_document();

-- 3. Effacement automatique, chaque nuit. La clé de service est lue dans le coffre-fort de la base
--    (Vault, secret « cle_service_stockage ») : elle n'est jamais dans le code ni dans Git.
create extension if not exists pg_cron;

create or replace function prive.effacer_documents_expires()
returns int language plpgsql security definer set search_path = '' as $$
declare
  d record;
  cle text;
  url text := 'https://asaltwruyylfoktdnnkw.supabase.co/storage/v1/object/documents/';
  n int := 0;
begin
  select decrypted_secret into cle from vault.decrypted_secrets where name = 'cle_service_stockage';
  if cle is null then
    raise warning 'Clé de service absente du coffre-fort : effacement des photos impossible';
    return 0;
  end if;
  for d in select id, fichier from public.private_documents where efface_le <= now() loop
    perform net.http_delete(
      url := url || d.fichier,
      headers := jsonb_build_object('apikey', cle, 'Authorization', 'Bearer ' || cle)
    );
    delete from public.private_documents where id = d.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function prive.effacer_documents_expires() from public, anon, authenticated;

select cron.schedule('effacer-permis-expires', '17 2 * * *', 'select prive.effacer_documents_expires()');
