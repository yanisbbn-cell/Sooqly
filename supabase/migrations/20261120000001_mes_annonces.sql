-- Sooqly – étape 10, morceau 1 : Mes annonces (statistiques, modification, expiration, republication).

-- 1. Règles de modification par l'auteur : contenu modifié → nouvelle vérification ; republication d'une annonce expirée.
create or replace function prive.proteger_annonce()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  contenu_change boolean;
  fourchettes jsonb;
  bornes jsonb;
begin
  new.modifie_le := now();

  if new.categorie = 'dons' then
    new.type := 'don';
    new.prix_da := 0;
  elsif new.categorie = 'services' then
    new.type := 'service';
  elsif new.type in ('don', 'service') then
    raise exception 'Type d''annonce incompatible avec la catégorie' using errcode = 'P0001';
  elsif new.type = 'location' and new.categorie not in ('immobilier', 'vehicules') then
    raise exception 'La location concerne seulement les logements et les véhicules' using errcode = 'P0001';
  end if;

  if new.sous_categorie_id is not null and not exists (
    select 1 from public.subcategories s where s.id = new.sous_categorie_id and s.categorie = new.categorie
  ) then
    raise exception 'Sous-catégorie incompatible avec la catégorie' using errcode = 'P0001';
  end if;

  if new.type in ('vente', 'service') and (tg_op = 'INSERT' or new.prix_da is distinct from old.prix_da) then
    select c.fourchettes_prix into fourchettes from public.categories c where c.cle = new.categorie;
    bornes := coalesce(fourchettes -> (case new.type when 'service' then 'Service' else 'Vente' end), fourchettes -> 'Vente');
    if bornes is not null and (new.prix_da < (bornes ->> 0)::bigint or new.prix_da > (bornes ->> 1)::bigint) then
      raise exception 'Prix incohérent pour cette catégorie' using errcode = 'P0001';
    end if;
  end if;

  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;

  if tg_op = 'INSERT' then
    new.statut := 'verification';
    new.motif_refus := null;
    new.publie_le := null;
    new.expire_le := null;
    new.sponsorise_jusqu := null;
    new.acheteur_id := null;
    return new;
  end if;
  if new.auteur_id is distinct from old.auteur_id then raise exception 'Auteur non modifiable'; end if;
  if new.sponsorise_jusqu is distinct from old.sponsorise_jusqu
     or new.motif_refus is distinct from old.motif_refus
     or new.publie_le is distinct from old.publie_le
     or new.expire_le is distinct from old.expire_le then
    raise exception 'Champ réservé à la modération';
  end if;

  -- Étape 10 : une annonce en ligne dont le contenu change repasse « En vérification »
  -- (seul le prix peut changer sans nouvelle vérification).
  contenu_change := (new.titre, new.description, new.categorie, new.sous_categorie_id, new.type, new.etat,
                     new.caracteristiques, new.wilaya_code, new.ville, new.permis_exige)
    is distinct from (old.titre, old.description, old.categorie, old.sous_categorie_id, old.type, old.etat,
                      old.caracteristiques, old.wilaya_code, old.ville, old.permis_exige);
  if contenu_change and old.statut in ('en_ligne', 'reserve') then
    new.statut := 'verification';
  end if;

  if new.statut is distinct from old.statut and not (
       (old.statut = 'en_ligne' and new.statut in ('reserve', 'vendu', 'loue', 'verification'))
    or (old.statut = 'reserve' and new.statut in ('en_ligne', 'vendu', 'loue', 'verification'))
    or (old.statut in ('refuse', 'expire') and new.statut = 'verification')
    or (old.statut = 'expire' and new.statut = 'en_ligne' and not contenu_change)
  ) then
    raise exception 'Changement de statut non autorisé';
  end if;

  -- Republication gratuite d'une annonce expirée : de nouveau 60 jours (réglage).
  if old.statut = 'expire' and new.statut = 'en_ligne' then
    new.publie_le := now();
    new.expire_le := now() + make_interval(days => (select s.duree_vie_annonce_jours from public.settings s where s.id = 1));
  end if;
  return new;
end $$;

-- 2. Une nouvelle photo ajoutée à une annonce en ligne la renvoie aussi en vérification.
create or replace function prive.photo_ajoutee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  update public.listings set statut = 'verification'
  where id = new.annonce_id and statut in ('en_ligne', 'reserve');
  return new;
end $$;
create trigger photo_ajoutee after insert on public.listing_photos
  for each row execute function prive.photo_ajoutee();

-- 3. Vues : comptées à chaque ouverture de la fiche par quelqu'un d'autre que l'auteur.
create or replace function public.compter_vue(p_annonce uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.listings l where l.id = p_annonce and l.statut in ('en_ligne', 'reserve')
                 and l.auteur_id is distinct from (select auth.uid())) then
    return;
  end if;
  insert into public.listing_stats (annonce_id, jour, vues) values (p_annonce, current_date, 1)
  on conflict (annonce_id, jour) do update set vues = public.listing_stats.vues + 1;
end $$;

-- 4. Statistiques de mes annonces : vues (total et 7 derniers jours), favoris, messages reçus, acheteur.
create or replace function public.stats_mes_annonces()
returns table (
  annonce_id uuid, vues integer, vues_7 integer[], favoris integer, messages integer,
  acheteur_id uuid, acheteur_nom text, hors_sooqly boolean, note_donnee boolean
) language sql stable security definer set search_path = '' as $$
  select l.id,
    coalesce((select sum(s.vues) from public.listing_stats s where s.annonce_id = l.id), 0)::integer,
    array(select coalesce((select s.vues from public.listing_stats s where s.annonce_id = l.id and s.jour = d::date), 0)
          from generate_series(current_date - 6, current_date, interval '1 day') d order by d),
    (select count(*) from public.favorites f where f.annonce_id = l.id)::integer,
    (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id
      where c.annonce_id = l.id and m.auteur_id <> l.auteur_id)::integer,
    t.acheteur_id, p.nom_affiche, (t.id is not null and t.acheteur_id is null),
    exists (select 1 from public.ratings r where r.transaction_id = t.id and r.auteur_id = l.auteur_id)
  from public.listings l
  left join public.transactions t on t.annonce_id = l.id and t.statut = 'conclue'
  left join public.profiles p on p.id = t.acheteur_id
  where l.auteur_id = (select auth.uid());
$$;

revoke all on function public.compter_vue(uuid), public.stats_mes_annonces() from public;
grant execute on function public.compter_vue(uuid) to anon, authenticated;
grant execute on function public.stats_mes_annonces() to authenticated;

-- 5. Expiration automatique après 60 jours, et rappel 7 jours avant (notification).
create or replace function prive.expirer_annonces()
returns void language plpgsql security definer set search_path = '' as $$
declare
  envois jsonb;
begin
  update public.listings set statut = 'expire'
  where statut in ('en_ligne', 'reserve') and expire_le is not null and expire_le <= now();

  select jsonb_agg(jsonb_build_object(
      'to', t.jeton,
      'title', case when p.langue = 'ar' then 'ينتهي إعلانك بعد 7 أيام' else 'Votre annonce expire dans 7 jours' end,
      'body', case when p.langue = 'ar' then l.titre || ' · يمكنك إعادة نشره مجانًا بعد انتهائه.'
                   else l.titre || ' · vous pourrez la republier gratuitement ensuite.' end,
      'sound', 'default',
      'data', jsonb_build_object('mes_annonces', true)))
    into envois
  from public.listings l
  join public.profiles p on p.id = l.auteur_id
  join public.push_tokens t on t.membre_id = l.auteur_id
  where l.statut in ('en_ligne', 'reserve')
    and l.expire_le > now() + interval '6 days' and l.expire_le <= now() + interval '7 days';
  if envois is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := envois,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
end $$;
revoke all on function prive.expirer_annonces() from public, anon, authenticated;

select cron.schedule('expirer-annonces', '23 3 * * *', 'select prive.expirer_annonces()');

-- 6. Modifier une annonce : on peut ajouter des photos tant qu'elle n'est ni vendue ni louée
--    (l'annonce repasse alors en vérification, voir photo_ajoutee).
create or replace function prive.proteger_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (new.resultat_detecteur is null or not new.resultat_detecteur ? 'source') then
    new.resultat_detecteur := jsonb_build_object('source', 'appareil', 'detail', new.resultat_detecteur);
  end if;
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.listings l where l.id = new.annonce_id and l.statut not in ('vendu', 'loue')
    ) then
      raise exception 'Photo refusée : annonce terminée' using errcode = 'P0001';
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

create or replace function prive.photo_ajoutee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  update public.listings set statut = 'verification'
  where id = new.annonce_id and statut in ('en_ligne', 'reserve', 'expire');
  return new;
end $$;
