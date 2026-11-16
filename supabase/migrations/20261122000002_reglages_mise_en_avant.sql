-- Sooqly – étape 12, partie 2 : réglages de l'administrateur, mise en avant, rôles, charte.

-- 1. Garde-fous sur les réglages (modifiés par l'administrateur depuis l'appli).
alter table public.settings
  add constraint settings_taux_ok check (taux_dinar_euro > 0 and taux_dinar_euro < 1),
  add constraint settings_seuil_ok check (seuil_badge between 1 and 1000),
  add constraint settings_duree_ok check (duree_vie_annonce_jours between 7 and 365),
  add constraint settings_rappel_ok check (rappel_expiration_jours between 1 and 30);

alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('valider', 'refuser', 'correction', 'retirer', 'suspendre', 'reactiver', 'exclure', 'sponsoriser', 'role'));

-- 2. Mise en avant : réservée aux annonces de pros, activée à la main par l'administrateur.
create or replace function public.sponsoriser(p_annonce uuid, p_jusqu timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  l record;
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  select li.id, li.auteur_id, li.statut, p.est_pro into l
  from public.listings li join public.profiles p on p.id = li.auteur_id where li.id = p_annonce;
  if l.id is null then return false; end if;
  if p_jusqu is not null and (not l.est_pro or l.statut not in ('en_ligne', 'reserve') or p_jusqu <= now()) then
    return false;
  end if;
  update public.listings set sponsorise_jusqu = p_jusqu where id = p_annonce;
  insert into public.moderation_actions (moderateur_id, membre_id, annonce_id, action, motif)
  values ((select auth.uid()), l.auteur_id, p_annonce, 'sponsoriser',
          case when p_jusqu is null then 'arrêt' else 'jusqu''au ' || to_char(p_jusqu at time zone 'Africa/Algiers', 'DD/MM/YYYY') end);
  return true;
end $$;

-- 3. Rôles : l'administrateur nomme ou retire les modérateurs.
create or replace function public.changer_role(p_membre uuid, p_role text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  if p_role not in ('membre', 'moderateur') or p_membre = (select auth.uid()) then return false; end if;
  update public.profiles set role = p_role where id = p_membre and role <> 'admin';
  if not found then return false; end if;
  insert into public.moderation_actions (moderateur_id, membre_id, action, motif)
  values ((select auth.uid()), p_membre, 'role', p_role);
  return true;
end $$;

-- 4. Charte : l'administrateur modifie un article ; la version change et tous les membres sont prévenus.
create or replace function public.publier_article_charte(p_numero smallint, p_titre_fr text, p_titre_ar text,
  p_paragraphes jsonb, p_puces jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  envois jsonb;
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  if coalesce(btrim(p_titre_fr), '') = '' or coalesce(btrim(p_titre_ar), '') = ''
     or jsonb_typeof(p_paragraphes) <> 'array' or jsonb_typeof(p_puces) <> 'array' then
    return false;
  end if;
  update public.charter_articles
    set titre_fr = btrim(p_titre_fr), titre_ar = btrim(p_titre_ar), paragraphes = p_paragraphes, puces = p_puces,
        version = version + 1
  where numero = p_numero;
  if not found then return false; end if;
  update public.settings set version_charte = version_charte + 1, modifie_le = now() where id = 1;

  select jsonb_agg(jsonb_build_object(
      'to', t.jeton,
      'title', case when p.langue = 'ar' then 'تحديث ميثاق سوقلي' else 'La charte Sooqly a été mise à jour' end,
      'body', case when p.langue = 'ar' then 'المادة ' || p_numero || ': ' || btrim(p_titre_ar)
                   else 'Article ' || p_numero || ' : ' || btrim(p_titre_fr) end,
      'sound', 'default',
      'data', jsonb_build_object('charte', true)))
    into envois
  from public.push_tokens t join public.profiles p on p.id = t.membre_id;
  if envois is not null then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
  return true;
end $$;

-- 5. Liste des modérateurs (pour les réglages).
create or replace function public.equipe_moderation()
returns table (id uuid, nom_affiche text, avatar smallint, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.est_admin() then raise exception 'Réservé à l''administrateur' using errcode = '42501'; end if;
  return query select p.id, p.nom_affiche, p.avatar, p.role from public.profiles p
    where p.role in ('moderateur', 'admin') order by p.role, p.nom_affiche;
end $$;

revoke all on function public.sponsoriser(uuid, timestamptz), public.changer_role(uuid, text),
  public.publier_article_charte(smallint, text, text, jsonb, jsonb), public.equipe_moderation() from public, anon;
grant execute on function public.sponsoriser(uuid, timestamptz), public.changer_role(uuid, text),
  public.publier_article_charte(smallint, text, text, jsonb, jsonb), public.equipe_moderation() to authenticated;
