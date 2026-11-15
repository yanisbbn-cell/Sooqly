-- Sooqly – étape 5 : photos des annonces.
-- Rangement : seau public « photos-annonces », chaque membre écrit seulement dans son dossier (son identifiant).
-- Les chemins contiennent un identifiant aléatoire ; une photo n'est montrée au public qu'après validation
-- (table listing_photos, décision « acceptee »).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-annonces', 'photos-annonces', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "photos : déposer dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : supprimer les siennes" on storage.objects for delete to authenticated
  using (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : la modération supprime" on storage.objects for delete to authenticated
  using (bucket_id = 'photos-annonces' and prive.est_moderateur());

-- Le détecteur tourne sur le téléphone : son résultat est gardé à titre indicatif pour la modération,
-- mais seule la modération décide (« decision_moderation »). Une photo ne s'ajoute qu'à une annonce
-- en vérification ou refusée (pas à une annonce déjà en ligne sans nouvelle vérification).
create or replace function prive.proteger_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.listings l where l.id = new.annonce_id and l.statut in ('verification', 'refuse')
    ) then
      raise exception 'Photo refusée : annonce déjà en ligne' using errcode = 'P0001';
    end if;
    if new.fichier not like (select auth.uid())::text || '/%' then
      raise exception 'Fichier hors de votre dossier' using errcode = 'P0001';
    end if;
    new.decision_moderation := 'en_attente';
    new.resultat_detecteur := jsonb_build_object('source', 'appareil', 'detail', new.resultat_detecteur);
  elsif new.resultat_detecteur is distinct from old.resultat_detecteur
     or new.decision_moderation is distinct from old.decision_moderation then
    raise exception 'Champ réservé au détecteur et à la modération';
  end if;
  return new;
end $$;

-- Valider une annonce accepte ses photos ; la refuser les refuse.
create or replace function prive.decision_photos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.statut is distinct from old.statut and new.statut in ('en_ligne', 'refuse') and old.statut = 'verification' then
    update public.listing_photos
      set decision_moderation = case new.statut when 'en_ligne' then 'acceptee' else 'refusee' end
      where annonce_id = new.id and decision_moderation = 'en_attente';
  end if;
  return new;
end $$;
create trigger decision_photos after update of statut on public.listings
  for each row execute function prive.decision_photos();
