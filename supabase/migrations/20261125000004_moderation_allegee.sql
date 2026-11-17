-- Sooqly – décision de Yanis du 17 novembre 2026 : la modération ne peut pas être faite annonce par annonce.
-- 1. Vendeur de confiance (au moins N annonces acceptées, aucun refus, aucune demande de correction, aucun retrait,
--    jamais suspendu) : son annonce est publiée tout de suite, si le détecteur de photos n'a rien trouvé ;
--    elle reste marquée « publiée directement » pour une vérification après coup par la modération.
-- 2. Une annonce signalée par N membres différents est masquée (repasse « En vérification ») en attendant la modération.
-- N et N sont des réglages de l'administrateur (5 et 2 au départ).

alter table public.settings
  add column seuil_publication_directe integer not null default 5,
  add column seuil_masquage_signalements integer not null default 2,
  add constraint settings_publication_directe_ok check (seuil_publication_directe between 1 and 100),
  add constraint settings_masquage_ok check (seuil_masquage_signalements between 1 and 20);

alter table public.listings
  add column publication_directe boolean not null default false,
  add column revue_le timestamptz,
  add column masquee_signalements boolean not null default false;

-- Le statut peut désormais être changé par le serveur (drapeau sooqly.statut_serveur).
CREATE OR REPLACE FUNCTION prive.proteger_annonce()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Publication directe (vendeur de confiance) et masquage après signalements : changements de statut faits
  -- par le serveur lui-même (voir prive.publier_si_confiance et prive.masquer_si_signalee).
  if (select auth.uid()) is null or prive.est_moderateur()
     or coalesce(current_setting('sooqly.statut_serveur', true), '') = 'oui' then return new; end if;

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
     or new.expire_le is distinct from old.expire_le
     or new.correction_demandee is distinct from old.correction_demandee then
    raise exception 'Champ réservé à la modération';
  end if;

  -- Étape 10 : une annonce en ligne dont le contenu change repasse « En vérification »
  -- (seul le prix peut changer sans nouvelle vérification).
  contenu_change := (new.titre, new.description, new.categorie, new.sous_categorie_id, new.type, new.etat,
                     new.caracteristiques, new.wilaya_code, new.ville, new.permis_exige, new.public_cours)
    is distinct from (old.titre, old.description, old.categorie, old.sous_categorie_id, old.type, old.etat,
                      old.caracteristiques, old.wilaya_code, old.ville, old.permis_exige, old.public_cours);
  if contenu_change and old.statut in ('en_ligne', 'reserve', 'refuse') then
    new.statut := 'verification';
  end if;
  -- Retour en vérification (après une correction demandée, par exemple) : la demande est close.
  if new.statut = 'verification' and old.statut <> 'verification' then
    new.correction_demandee := false;
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
end $function$;

-- Photos : la décision automatique (publication directe) passe par le même drapeau.
CREATE OR REPLACE FUNCTION prive.proteger_photo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' and (new.resultat_detecteur is null or not new.resultat_detecteur ? 'source') then
    new.resultat_detecteur := jsonb_build_object('source', 'appareil', 'detail', new.resultat_detecteur);
  end if;
  if (select auth.uid()) is null or prive.est_moderateur()
     or coalesce(current_setting('sooqly.statut_serveur', true), '') = 'oui' then return new; end if;
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
end $function$;

-- Ces trois colonnes ne sont modifiables que par le serveur ou la modération.
create or replace function prive.proteger_drapeaux_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur()
     or coalesce(current_setting('sooqly.statut_serveur', true), '') = 'oui' then
    -- Quand l'annonce sort de la vérification, le masquage n'a plus lieu d'être.
    if new.statut <> 'verification' then new.masquee_signalements := false; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.publication_directe := false; new.revue_le := null; new.masquee_signalements := false;
  elsif new.publication_directe is distinct from old.publication_directe or new.revue_le is distinct from old.revue_le
        or new.masquee_signalements is distinct from old.masquee_signalements then
    raise exception 'Champ réservé à la modération';
  end if;
  return new;
end $$;
create trigger proteger_drapeaux_moderation before insert or update on public.listings
  for each row execute function prive.proteger_drapeaux_moderation();

-- Vendeur de confiance ?
create or replace function prive.vendeur_de_confiance(p_membre uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    not coalesce((select p.suspendu or p.exclu from public.profiles p where p.id = p_membre), true)
    and (select count(*) from public.listings l where l.auteur_id = p_membre and l.publie_le is not null)
        >= (select s.seuil_publication_directe from public.settings s where s.id = 1)
    and not exists (
      select 1 from public.moderation_actions m
      where m.membre_id = p_membre and m.action in ('refuser', 'correction', 'retirer', 'suspendre', 'exclure')
    );
$$;

-- Appelée par l'application une fois l'annonce et ses photos envoyées (création ou modification).
-- Renvoie 'en_ligne' si l'annonce a été publiée directement, sinon 'verification'.
create or replace function public.finaliser_publication(p_annonce uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  l record;
  jours integer := (select s.duree_vie_annonce_jours from public.settings s where s.id = 1);
begin
  select id, auteur_id, statut, publie_le into l from public.listings where id = p_annonce;
  if l.id is null or l.auteur_id <> (select auth.uid()) then return null; end if;
  if l.statut <> 'verification' then return l.statut; end if;
  if not prive.vendeur_de_confiance(l.auteur_id) then return 'verification'; end if;
  -- Une annonce déjà refusée, corrigée ou retirée une fois repasse toujours par un humain.
  if exists (select 1 from public.moderation_actions m
             where m.annonce_id = p_annonce and m.action in ('refuser', 'correction', 'retirer')) then
    return 'verification';
  end if;
  -- Une annonce masquée après des signalements attend la modération.
  if exists (select 1 from public.listings x where x.id = p_annonce and x.masquee_signalements) then return 'verification'; end if;
  -- Photos : toutes doivent avoir été analysées par le détecteur, sans rien de suspect.
  if exists (
    select 1 from public.listing_photos p
    where p.annonce_id = p_annonce and p.decision_moderation = 'en_attente'
      and (p.resultat_detecteur -> 'detail' is null or jsonb_typeof(p.resultat_detecteur -> 'detail') <> 'object'
           or coalesce((p.resultat_detecteur -> 'detail' ->> 'interdit')::boolean, true)
           or coalesce((p.resultat_detecteur -> 'detail' ->> 'erreur')::boolean, false))
  ) then return 'verification'; end if;

  perform set_config('sooqly.statut_serveur', 'oui', true);
  update public.listings
    set statut = 'en_ligne', publie_le = now(), expire_le = now() + make_interval(days => jours),
        motif_refus = null, publication_directe = true, revue_le = null
    where id = p_annonce;
  perform set_config('sooqly.statut_serveur', '', true);
  return 'en_ligne';
end $$;
revoke execute on function public.finaliser_publication(uuid) from public, anon;
grant execute on function public.finaliser_publication(uuid) to authenticated;

-- Vérification après coup : la modération confirme qu'une annonce publiée directement est conforme.
create or replace function public.marquer_revue(p_annonce uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not prive.est_moderateur() then raise exception 'Réservé à la modération' using errcode = '42501'; end if;
  update public.listings set revue_le = now() where id = p_annonce and publication_directe and revue_le is null;
  return found;
end $$;
revoke execute on function public.marquer_revue(uuid) from public, anon;
grant execute on function public.marquer_revue(uuid) to authenticated;

-- Masquage automatique après N signalements de membres différents.
create or replace function prive.masquer_si_signalee()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  seuil integer := (select s.seuil_masquage_signalements from public.settings s where s.id = 1);
begin
  if new.annonce_id is null then return new; end if;
  select count(distinct r.auteur_id) into n
  from public.reports r join public.listings l on l.id = r.annonce_id
  where r.annonce_id = new.annonce_id and r.traitement in ('a_traiter', 'en_cours') and r.auteur_id <> l.auteur_id;
  if n >= seuil then
    perform set_config('sooqly.statut_serveur', 'oui', true);
    update public.listings set statut = 'verification', masquee_signalements = true
      where id = new.annonce_id and statut in ('en_ligne', 'reserve');
    perform set_config('sooqly.statut_serveur', '', true);
  end if;
  return new;
end $$;
create trigger masquer_si_signalee after insert on public.reports
  for each row execute function prive.masquer_si_signalee();
