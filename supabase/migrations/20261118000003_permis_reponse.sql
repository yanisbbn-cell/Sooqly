-- Sooqly – étape 8 : quand le loueur accepte ou refuse un permis, une bulle « permis » apparaît
-- dans la discussion (et le locataire reçoit une notification, comme pour tout message).
create or replace function prive.annoncer_reponse_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  conv uuid;
begin
  if new.statut is distinct from old.statut and new.statut in ('accepte', 'refuse') then
    select c.id into conv from public.conversations c
      where c.annonce_id = new.annonce_id and c.acheteur_id = new.expediteur_id and c.vendeur_id = new.destinataire_id;
    if conv is not null then
      insert into public.messages (conversation_id, auteur_id, type, contenu)
      values (conv, new.destinataire_id, 'permis', new.id::text);
    end if;
  end if;
  return new;
end $$;
create trigger annoncer_reponse_document after update of statut on public.private_documents
  for each row execute function prive.annoncer_reponse_document();
