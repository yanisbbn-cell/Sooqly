-- Sooqly – étape 7 (demande de Yanis) : vocaux façon Telegram, avec la forme d'onde.
-- La forme d'onde est calculée sur le téléphone pendant l'enregistrement : 48 barres, hauteur de 0 à 100.
alter table public.messages
  add column onde smallint[] check (onde is null or (cardinality(onde) <= 64 and 0 <= all (onde) and 100 >= all (onde)));

-- Comme le reste du message, la forme d'onde ne peut plus être modifiée après l'envoi.
create or replace function prive.proteger_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if (new.conversation_id, new.auteur_id, new.type, new.contenu, new.fichier, new.duree_secondes,
      new.lieu_nom, new.lieu_lat, new.lieu_lng, new.cree_le, new.onde)
     is distinct from
     (old.conversation_id, old.auteur_id, old.type, old.contenu, old.fichier, old.duree_secondes,
      old.lieu_nom, old.lieu_lat, old.lieu_lng, old.cree_le, old.onde) then
    raise exception 'Seul l''état « lu » peut être modifié';
  end if;
  return new;
end $$;
