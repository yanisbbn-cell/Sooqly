-- Sooqly – étape 10, morceau 2 : favoris et alerte de baisse de prix.

-- 1. Le prix au moment de l'ajout en favori (pour afficher l'ancien prix barré et le pourcentage de baisse).
alter table public.favorites add column prix_ajout_da bigint;

create or replace function prive.preparer_favori()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not prive.annonce_visible(new.annonce_id) then
      raise exception 'Annonce indisponible' using errcode = 'P0001';
    end if;
    new.prix_ajout_da := (select l.prix_da from public.listings l where l.id = new.annonce_id);
    new.cree_le := now();
  else
    new.prix_ajout_da := old.prix_ajout_da;
    new.cree_le := old.cree_le;
    new.annonce_id := old.annonce_id;
    new.membre_id := old.membre_id;
  end if;
  return new;
end $$;
create trigger preparer_favori before insert or update on public.favorites
  for each row execute function prive.preparer_favori();

-- 2. Baisse de prix : notification aux membres qui ont activé l'alerte sur ce favori.
create or replace function prive.notifier_baisse_prix()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l record;
  envois jsonb;
begin
  if new.nouveau_prix_da >= new.ancien_prix_da then return new; end if;
  select id, titre, statut, type, auteur_id into l from public.listings where id = new.annonce_id;
  if l.statut not in ('en_ligne', 'reserve') or l.type = 'location' then return new; end if;
  select jsonb_agg(jsonb_build_object(
      'to', t.jeton,
      'title', case when p.langue = 'ar' then 'انخفض السعر' else 'Prix en baisse' end,
      'body', l.titre || ' · ' || replace(to_char(new.nouveau_prix_da, 'FM999,999,999'), ',', ' ') || case when p.langue = 'ar' then ' دج' else ' DA' end,
      'sound', 'default',
      'data', jsonb_build_object('annonce_id', l.id)))
    into envois
  from public.favorites f
  join public.profiles p on p.id = f.membre_id
  join public.push_tokens t on t.membre_id = f.membre_id
  where f.annonce_id = l.id and f.alerte_prix and f.membre_id <> l.auteur_id;
  if envois is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  return new;
end $$;
create trigger notifier_baisse_prix after insert on public.listing_prices
  for each row execute function prive.notifier_baisse_prix();

revoke all on function prive.preparer_favori(), prive.notifier_baisse_prix() from public, anon, authenticated;
