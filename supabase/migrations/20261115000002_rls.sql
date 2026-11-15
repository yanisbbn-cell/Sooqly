-- Sooqly – étape 2 : règles d'accès (RLS) sur TOUTES les tables.
-- Principe : sans règle explicite, tout est refusé.

-- Fonctions d'aide, rangées dans un schéma non exposé par l'API.
create schema if not exists prive;
revoke all on schema prive from public, anon, authenticated;
grant usage on schema prive to anon, authenticated;

create or replace function prive.est_moderateur()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('moderateur', 'admin') and not p.suspendu
  );
$$;

create or replace function prive.est_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and not p.suspendu
  );
$$;

-- Une annonce est visible par tous si elle est en ligne ou réservée ;
-- toujours visible par son auteur et par la modération.
create or replace function prive.annonce_visible(p_annonce uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_annonce
      and (l.statut in ('en_ligne', 'reserve') or l.auteur_id = (select auth.uid()) or prive.est_moderateur())
  );
$$;

create or replace function prive.est_auteur_annonce(p_annonce uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings l where l.id = p_annonce and l.auteur_id = (select auth.uid()));
$$;

create or replace function prive.participe(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and (select auth.uid()) in (c.acheteur_id, c.vendeur_id)
  );
$$;

-- Vrai si « p_membre » a bloqué « p_auteur ».
create or replace function prive.a_bloque(p_membre uuid, p_auteur uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks b where b.membre_id = p_membre and b.bloque_id = p_auteur);
$$;

create or replace function prive.membre_actif()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and not p.suspendu);
$$;

revoke all on all functions in schema prive from public;
grant execute on all functions in schema prive to anon, authenticated;

-- Activer RLS partout.
do $$
declare t text;
begin
  foreach t in array array[
    'wilayas', 'categories', 'subcategories', 'banned_families', 'banned_terms', 'charter_articles',
    'charter_texts', 'settings', 'profiles', 'listings', 'listing_rates', 'listing_photos', 'listing_prices',
    'listing_stats', 'availability', 'conversations', 'messages', 'private_documents', 'transactions',
    'ratings', 'favorites', 'search_alerts', 'blocks', 'reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ============================================================
-- Données de référence : lecture publique, écriture par l'administrateur
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'wilayas', 'categories', 'subcategories', 'banned_families', 'banned_terms',
    'charter_articles', 'charter_texts', 'settings'
  ] loop
    execute format('create policy "lecture publique" on public.%I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "écriture administrateur" on public.%I for all to authenticated using (prive.est_admin()) with check (prive.est_admin())', t);
  end loop;
end $$;

-- ============================================================
-- Profils : fiche publique, chacun ne modifie que la sienne
-- ============================================================
create policy "profils visibles" on public.profiles for select to anon, authenticated using (true);
create policy "créer son profil" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "modifier son profil" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or prive.est_moderateur())
  with check (id = (select auth.uid()) or prive.est_moderateur());

-- Un membre ne peut pas se donner un rôle, se « dé-suspendre » ou se déclarer vérifié lui-même.
create or replace function prive.proteger_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Les opérations côté serveur (sans utilisateur connecté) ne sont pas limitées.
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if not prive.est_admin() then
      new.role := 'membre';
      new.suspendu := false;
      new.telephone_verifie := false;
    end if;
    return new;
  end if;
  if not prive.est_admin() and new.role is distinct from old.role then
    raise exception 'Modification du rôle interdite';
  end if;
  if not prive.est_moderateur() and new.suspendu is distinct from old.suspendu then
    raise exception 'Modification de la suspension interdite';
  end if;
  if new.telephone_verifie is distinct from old.telephone_verifie then
    raise exception 'La vérification du téléphone est faite par le serveur';
  end if;
  if new.code_parrainage is distinct from old.code_parrainage or new.parrain_id is distinct from old.parrain_id then
    raise exception 'Le parrainage ne peut pas être modifié';
  end if;
  return new;
end $$;
create trigger proteger_profil before insert or update on public.profiles
  for each row execute function prive.proteger_profil();

-- ============================================================
-- Annonces
-- ============================================================
create policy "annonces visibles" on public.listings for select to anon, authenticated
  using (statut in ('en_ligne', 'reserve') or auteur_id = (select auth.uid()) or prive.est_moderateur());
create policy "publier" on public.listings for insert to authenticated
  with check (auteur_id = (select auth.uid()) and prive.membre_actif());
create policy "modifier son annonce" on public.listings for update to authenticated
  using (auteur_id = (select auth.uid()) or prive.est_moderateur())
  with check (auteur_id = (select auth.uid()) or prive.est_moderateur());
create policy "supprimer son annonce" on public.listings for delete to authenticated
  using (auteur_id = (select auth.uid()) or prive.est_moderateur());

-- Seule la modération met une annonce en ligne, la refuse ou la sponsorise.
create or replace function prive.proteger_annonce()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.modifie_le := now();
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
  if new.statut is distinct from old.statut and not (
       (old.statut = 'en_ligne' and new.statut in ('reserve', 'vendu', 'loue'))
    or (old.statut = 'reserve' and new.statut in ('en_ligne', 'vendu', 'loue'))
    or (old.statut in ('refuse', 'expire') and new.statut = 'verification')
  ) then
    raise exception 'Changement de statut non autorisé';
  end if;
  return new;
end $$;
create trigger proteger_annonce before insert or update on public.listings
  for each row execute function prive.proteger_annonce();

-- Historique des prix (déclenche plus tard les alertes de baisse de prix).
create or replace function prive.historiser_prix()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.prix_da is distinct from old.prix_da then
    insert into public.listing_prices (annonce_id, ancien_prix_da, nouveau_prix_da)
    values (new.id, old.prix_da, new.prix_da);
  end if;
  return new;
end $$;
create trigger historiser_prix after update of prix_da on public.listings
  for each row execute function prive.historiser_prix();

-- Tarifs, disponibilités : visibles avec l'annonce, modifiés par son auteur.
do $$
declare t text;
begin
  foreach t in array array['listing_rates', 'availability'] loop
    execute format('create policy "visibles avec l''annonce" on public.%I for select to anon, authenticated using (prive.annonce_visible(annonce_id))', t);
    execute format('create policy "gérés par l''auteur" on public.%I for all to authenticated using (prive.est_auteur_annonce(annonce_id)) with check (prive.est_auteur_annonce(annonce_id))', t);
  end loop;
end $$;

-- Photos : seules les photos acceptées sont publiques ; l'auteur et la modération voient tout.
create policy "photos visibles" on public.listing_photos for select to anon, authenticated
  using (
    (decision_moderation = 'acceptee' and prive.annonce_visible(annonce_id))
    or prive.est_auteur_annonce(annonce_id) or prive.est_moderateur()
  );
create policy "ajouter ses photos" on public.listing_photos for insert to authenticated
  with check (prive.est_auteur_annonce(annonce_id));
create policy "modifier ses photos" on public.listing_photos for update to authenticated
  using (prive.est_auteur_annonce(annonce_id) or prive.est_moderateur())
  with check (prive.est_auteur_annonce(annonce_id) or prive.est_moderateur());
create policy "supprimer ses photos" on public.listing_photos for delete to authenticated
  using (prive.est_auteur_annonce(annonce_id) or prive.est_moderateur());

create or replace function prive.proteger_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or prive.est_moderateur() then return new; end if;
  if tg_op = 'INSERT' then
    new.resultat_detecteur := null;
    new.decision_moderation := 'en_attente';
  elsif new.resultat_detecteur is distinct from old.resultat_detecteur
     or new.decision_moderation is distinct from old.decision_moderation then
    raise exception 'Champ réservé au détecteur et à la modération';
  end if;
  return new;
end $$;
create trigger proteger_photo before insert or update on public.listing_photos
  for each row execute function prive.proteger_photo();

-- Historique des prix : public avec l'annonce, écrit uniquement par le serveur.
create policy "historique visible" on public.listing_prices for select to anon, authenticated
  using (prive.annonce_visible(annonce_id));

-- Statistiques : seulement pour l'auteur de l'annonce (écrites par le serveur).
create policy "statistiques de l'auteur" on public.listing_stats for select to authenticated
  using (prive.est_auteur_annonce(annonce_id) or prive.est_moderateur());

-- ============================================================
-- Messagerie : chacun ne voit que ses propres discussions
-- ============================================================
create policy "mes discussions" on public.conversations for select to authenticated
  using ((select auth.uid()) in (acheteur_id, vendeur_id));
create policy "contacter un vendeur" on public.conversations for insert to authenticated
  with check (
    acheteur_id = (select auth.uid())
    and prive.membre_actif()
    and exists (
      select 1 from public.listings l
      where l.id = annonce_id and l.auteur_id = vendeur_id and l.statut in ('en_ligne', 'reserve')
    )
    and not prive.a_bloque(vendeur_id, acheteur_id)
  );

create policy "messages de mes discussions" on public.messages for select to authenticated
  using (prive.participe(conversation_id));
create policy "écrire si non bloqué" on public.messages for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and prive.membre_actif()
    and prive.participe(conversation_id)
    and not exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and prive.a_bloque(case when c.acheteur_id = auteur_id then c.vendeur_id else c.acheteur_id end, auteur_id)
    )
  );
-- Le destinataire marque un message comme lu (aucun autre champ modifiable, voir déclencheur).
create policy "marquer comme lu" on public.messages for update to authenticated
  using (prive.participe(conversation_id) and auteur_id <> (select auth.uid()))
  with check (prive.participe(conversation_id) and auteur_id <> (select auth.uid()));

create or replace function prive.proteger_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if (new.conversation_id, new.auteur_id, new.type, new.contenu, new.fichier, new.duree_secondes,
      new.lieu_nom, new.lieu_lat, new.lieu_lng, new.cree_le)
     is distinct from
     (old.conversation_id, old.auteur_id, old.type, old.contenu, old.fichier, old.duree_secondes,
      old.lieu_nom, old.lieu_lat, old.lieu_lng, old.cree_le) then
    raise exception 'Seul l''état « lu » peut être modifié';
  end if;
  return new;
end $$;
create trigger proteger_message before update on public.messages
  for each row execute function prive.proteger_message();

create or replace function prive.date_dernier_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set dernier_message_le = new.cree_le where id = new.conversation_id;
  return new;
end $$;
create trigger date_dernier_message after insert on public.messages
  for each row execute function prive.date_dernier_message();

-- Documents privés (permis) : l'expéditeur et le seul destinataire.
create policy "mes documents" on public.private_documents for select to authenticated
  using ((select auth.uid()) in (expediteur_id, destinataire_id));
create policy "envoyer un document" on public.private_documents for insert to authenticated
  with check (expediteur_id = (select auth.uid()) and prive.membre_actif());
create policy "répondre à un document" on public.private_documents for update to authenticated
  using (destinataire_id = (select auth.uid()))
  with check (destinataire_id = (select auth.uid()));

create or replace function prive.proteger_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if (new.expediteur_id, new.destinataire_id, new.annonce_id, new.fichier, new.efface_le, new.cree_le)
     is distinct from
     (old.expediteur_id, old.destinataire_id, old.annonce_id, old.fichier, old.efface_le, old.cree_le) then
    raise exception 'Seul le statut peut être modifié';
  end if;
  return new;
end $$;
create trigger proteger_document before update on public.private_documents
  for each row execute function prive.proteger_document();

-- ============================================================
-- Transactions et notes
-- ============================================================
create policy "mes transactions" on public.transactions for select to authenticated
  using ((select auth.uid()) in (acheteur_id, vendeur_id) or prive.est_moderateur());
create policy "déclarer une vente" on public.transactions for insert to authenticated
  with check (vendeur_id = (select auth.uid()) and prive.est_auteur_annonce(annonce_id));

create policy "notes publiques" on public.ratings for select to anon, authenticated using (true);
create policy "noter une transaction" on public.ratings for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.acheteur_id is not null
        and (
          (role = 'acheteur' and t.acheteur_id = auteur_id and t.vendeur_id = cible_id)
          or (role = 'vendeur' and t.vendeur_id = auteur_id and t.acheteur_id = cible_id)
        )
    )
  );
create policy "corriger sa note sous 48 h" on public.ratings for update to authenticated
  using (auteur_id = (select auth.uid()) and cree_le > now() - interval '48 hours')
  with check (auteur_id = (select auth.uid()) and cree_le > now() - interval '48 hours');

create or replace function prive.proteger_note()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if (new.transaction_id, new.auteur_id, new.cible_id, new.role, new.cree_le)
     is distinct from (old.transaction_id, old.auteur_id, old.cible_id, old.role, old.cree_le) then
    raise exception 'Seules les étoiles peuvent être corrigées';
  end if;
  return new;
end $$;
create trigger proteger_note before update on public.ratings
  for each row execute function prive.proteger_note();

-- ============================================================
-- Données personnelles : favoris, alertes, blocages
-- ============================================================
create policy "mes favoris" on public.favorites for all to authenticated
  using (membre_id = (select auth.uid())) with check (membre_id = (select auth.uid()));
create policy "mes alertes" on public.search_alerts for all to authenticated
  using (membre_id = (select auth.uid())) with check (membre_id = (select auth.uid()));
-- Le membre bloqué n'en est jamais averti : il ne voit pas les blocages qui le visent.
create policy "mes blocages" on public.blocks for all to authenticated
  using (membre_id = (select auth.uid())) with check (membre_id = (select auth.uid()));

-- ============================================================
-- Signalements : anonymes, lus uniquement par la modération
-- ============================================================
create policy "signaler" on public.reports for insert to authenticated
  with check (auteur_id = (select auth.uid()));
create policy "modération : lire" on public.reports for select to authenticated using (prive.est_moderateur());
create policy "modération : traiter" on public.reports for update to authenticated
  using (prive.est_moderateur()) with check (prive.est_moderateur());
