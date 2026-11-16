-- Sooqly – étape 14 : retours des testeurs (bouton « Signaler un problème », versions de test seulement).

create table public.retours (
  id bigint generated always as identity primary key,
  membre_id uuid references public.profiles (id) on delete set null,
  message text not null check (char_length(message) between 3 and 4000),
  ecran text check (char_length(ecran) <= 200),
  appareil jsonb not null default '{}'::jsonb,
  capture text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'lu', 'corrige')),
  cree_le timestamptz not null default now()
);
alter table public.retours enable row level security;
alter table public.retours force row level security;

-- Tout le monde peut envoyer un retour (même avant d'avoir un compte : l'inscription peut être le problème).
create policy "envoyer un retour" on public.retours for insert to anon, authenticated
  with check (membre_id is null or membre_id = (select auth.uid()));
-- Seul l'administrateur les lit et les traite.
create policy "administrateur : lire" on public.retours for select to authenticated using (prive.est_admin());
create policy "administrateur : traiter" on public.retours for update to authenticated
  using (prive.est_admin()) with check (prive.est_admin());

create or replace function prive.proteger_retour()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  limite integer := 20;
  n integer;
begin
  if tg_op = 'INSERT' then
    new.statut := 'nouveau';
    new.cree_le := now();
    if (select auth.uid()) is null then new.capture := null; end if;
    -- Pas plus de 20 retours par heure et par membre (ou 60 pour l'ensemble des visiteurs).
    if (select auth.uid()) is null then limite := 60; end if;
    select count(*) into n from public.retours r where r.cree_le > now() - interval '1 hour'
      and (r.membre_id = (select auth.uid()) or ((select auth.uid()) is null and r.membre_id is null));
    if n >= limite then
      raise exception 'Trop de retours en peu de temps : réessayez plus tard' using errcode = 'P0001';
    end if;
  elsif new.message is distinct from old.message or new.membre_id is distinct from old.membre_id then
    raise exception 'Seul le statut d''un retour se modifie' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger proteger_retour before insert or update on public.retours
  for each row execute function prive.proteger_retour();
revoke all on function prive.proteger_retour() from public, anon, authenticated;

-- Captures d'écran : dossier privé du membre ; seul l'administrateur les ouvre.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retours', 'retours', false, 3145728, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy "retours : déposer sa capture" on storage.objects for insert to authenticated
  with check (bucket_id = 'retours' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "retours : l'administrateur ouvre" on storage.objects for select to authenticated
  using (bucket_id = 'retours' and prive.est_admin());
