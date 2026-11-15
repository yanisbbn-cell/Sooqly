-- Sooqly – étape 7 : messages vocaux, rangés dans un seau PRIVÉ.
-- Chemin : <identifiant de la discussion>/<fichier>. Seuls les deux membres de la discussion
-- peuvent déposer et écouter (liens temporaires).
insert into storage.buckets (id, name, public, file_size_limit)
values ('vocaux', 'vocaux', false, 5242880)
on conflict (id) do nothing;

create or replace function prive.participe_chemin(p_nom text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when (storage.foldername(p_nom))[1] ~ '^[0-9a-f-]{36}$' then prive.participe(((storage.foldername(p_nom))[1])::uuid)
    else false
  end;
$$;
revoke all on function prive.participe_chemin(text) from public;
grant execute on function prive.participe_chemin(text) to authenticated;

create policy "vocaux : déposer dans ses discussions" on storage.objects for insert to authenticated
  with check (bucket_id = 'vocaux' and prive.participe_chemin(name));
create policy "vocaux : écouter ses discussions" on storage.objects for select to authenticated
  using (bucket_id = 'vocaux' and prive.participe_chemin(name));
