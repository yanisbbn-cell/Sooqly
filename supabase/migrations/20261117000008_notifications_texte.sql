-- Sooqly – étape 7 : textes des notifications sans émoji (même ton que l'appli).
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
    when 'vocal' then case when langue = 'ar' then 'رسالة صوتية' else 'Message vocal' end
    when 'lieu' then case when langue = 'ar' then 'مكان اللقاء' else 'Lieu de rendez-vous' end
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
