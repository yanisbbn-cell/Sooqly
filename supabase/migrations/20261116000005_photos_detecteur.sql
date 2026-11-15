-- Sooqly – étape 5 : le résultat du détecteur est rangé de la même façon pour tout le monde
-- (y compris quand un modérateur publie lui-même une annonce).
create or replace function prive.proteger_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (new.resultat_detecteur is null or not new.resultat_detecteur ? 'source') then
    new.resultat_detecteur := jsonb_build_object('source', 'appareil', 'detail', new.resultat_detecteur);
  end if;
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
  elsif new.resultat_detecteur is distinct from old.resultat_detecteur
     or new.decision_moderation is distinct from old.decision_moderation then
    raise exception 'Champ réservé au détecteur et à la modération';
  end if;
  return new;
end $$;
