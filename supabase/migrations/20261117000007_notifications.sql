-- Sooqly – étape 7 : notifications de nouveaux messages.
-- Le téléphone enregistre son « jeton » Expo ; à chaque nouveau message, la base envoie une notification
-- au destinataire par le service gratuit d'Expo (exp.host), grâce à l'extension pg_net (appel web depuis la base).

create extension if not exists pg_net with schema extensions;

create table public.push_tokens (
  jeton text primary key,
  membre_id uuid not null references public.profiles (id) on delete cascade,
  plateforme text,
  maj_le timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
alter table public.push_tokens force row level security;
create policy "mes jetons" on public.push_tokens for select to authenticated using (membre_id = (select auth.uid()));
create policy "supprimer mes jetons" on public.push_tokens for delete to authenticated using (membre_id = (select auth.uid()));

-- Un même téléphone peut changer de compte : le jeton est rattaché au dernier compte connecté.
create or replace function public.enregistrer_jeton(p_jeton text, p_plateforme text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or p_jeton !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Jeton invalide' using errcode = 'P0001';
  end if;
  insert into public.push_tokens (jeton, membre_id, plateforme, maj_le)
  values (p_jeton, (select auth.uid()), left(p_plateforme, 20), now())
  on conflict (jeton) do update set membre_id = excluded.membre_id, plateforme = excluded.plateforme, maj_le = now();
end $$;
revoke all on function public.enregistrer_jeton(text, text) from public, anon;
grant execute on function public.enregistrer_jeton(text, text) to authenticated;

create or replace function prive.notifier_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c record;
  destinataire uuid;
  langue text;
  expediteur text;
  corps text;
  envois jsonb;
begin
  select * into c from public.conversations where id = new.conversation_id;
  destinataire := case when c.acheteur_id = new.auteur_id then c.vendeur_id else c.acheteur_id end;
  select p.langue into langue from public.profiles p where p.id = destinataire;
  select coalesce(case when p.est_pro then p.nom_commercial end, p.nom_affiche) into expediteur from public.profiles p where p.id = new.auteur_id;
  corps := case new.type
    when 'vocal' then case when langue = 'ar' then '🎤 رسالة صوتية' else '🎤 Message vocal' end
    when 'lieu' then case when langue = 'ar' then '📍 مكان اللقاء' else '📍 Lieu de rendez-vous' end
    when 'permis' then case when langue = 'ar' then 'رخصة السياقة' else 'Permis de conduire' end
    else left(coalesce(new.contenu, ''), 140)
  end;
  select jsonb_agg(jsonb_build_object(
      'to', t.jeton, 'title', expediteur, 'body', corps, 'sound', 'default',
      'data', jsonb_build_object('conversation_id', new.conversation_id)))
    into envois
  from public.push_tokens t where t.membre_id = destinataire;
  if envois is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  -- Une notification ratée ne doit jamais empêcher l'envoi du message.
  return new;
end $$;
create trigger notifier_message after insert on public.messages
  for each row execute function prive.notifier_message();

-- Nombre total de messages non lus (pastille de l'onglet Messages).
create or replace function public.nombre_non_lus()
returns int language sql stable set search_path = '' as $$
  select count(*)::int from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where not m.lu and m.auteur_id <> (select auth.uid()) and (select auth.uid()) in (c.acheteur_id, c.vendeur_id);
$$;
grant execute on function public.nombre_non_lus() to authenticated;
