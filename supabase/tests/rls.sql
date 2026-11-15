-- Sooqly – tests des règles d'accès (RLS).
-- Tout se passe dans un seul bloc qui se termine par une erreur volontaire « TESTS_OK » :
-- la base revient donc à son état initial (aucun compte de test ne reste).
-- Lancement : via l'API Supabase (voir supabase/README.md).
do $$
declare
  a uuid := gen_random_uuid();   -- vendeur
  b uuid := gen_random_uuid();   -- acheteur
  c uuid := gen_random_uuid();   -- autre membre
  m uuid := gen_random_uuid();   -- modérateur
  d uuid := gen_random_uuid();   -- nouvel inscrit
  annonce uuid;
  conv uuid;
  n int;
  t text;
  ok boolean;
  procedure_texte text;

begin
  -- ---------- 0. Contenu de départ ----------
  select count(*) into n from public.wilayas; assert n = 69, 'il faut 69 wilayas, trouvé ' || n;
  select count(*) into n from public.categories; assert n = 10, 'il faut 10 catégories, trouvé ' || n;
  select count(*) into n from public.subcategories; assert n > 50, 'sous-catégories manquantes';
  select count(*) into n from public.charter_articles; assert n = 13, 'il faut 13 articles, trouvé ' || n;
  select count(*) into n from public.charter_texts; assert n = 3, 'textes de la charte manquants';
  select count(*) into n from public.banned_terms; assert n > 40, 'mots interdits manquants';
  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  assert n = 0, n || ' table(s) sans RLS';

  -- ---------- Comptes de test ----------
  insert into auth.users (id, instance_id, aud, role, email)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x || '@test.invalid'
  from unnest(array[a, b, c, m]) as x;
  insert into public.profiles (id, nom_affiche, wilaya_code, role) values
    (a, 'Abou Test A', 16, 'membre'), (b, 'Abou Test B', 31, 'membre'),
    (c, 'Abou Test C', 9, 'membre'), (m, 'Modérateur', 16, 'moderateur');

  -- ---------- 1. Visiteur (non connecté) ----------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.wilayas; assert n = 69, 'visiteur : wilayas illisibles';
  select count(*) into n from public.charter_articles; assert n = 13, 'visiteur : charte illisible';
  begin
    insert into public.wilayas values (70, 'X', 'X');
    assert false, 'visiteur : a pu ajouter une wilaya';
  exception when insufficient_privilege then null; end;
  begin
    update public.settings set seuil_badge = 1;
    get diagnostics n = row_count; assert n = 0, 'visiteur : a pu modifier les réglages';
  exception when insufficient_privilege then null; end;
  reset role;

  -- ---------- 2. Le membre A publie ----------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.profiles set role = 'admin' where id = a;
    assert false, 'A : a pu se donner le rôle admin';
  exception when raise_exception then null; end;
  begin
    update public.profiles set nom_affiche = 'Piraté' where id = b;
    get diagnostics n = row_count; assert n = 0, 'A : a pu modifier le profil de B';
  end;
  insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut)
    values (a, 'vente', 'electro', 'Réfrigérateur de test', 45000, 16, 'en_ligne')
    returning id, statut into annonce, t;
  assert t = 'verification', 'A : annonce publiée sans vérification (' || t || ')';
  begin
    update public.listings set statut = 'en_ligne' where id = annonce;
    assert false, 'A : a mis son annonce en ligne sans modération';
  exception when raise_exception then null; end;
  begin
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
      values (b, 'vente', 'electro', 'Annonce au nom de B', 1000, 16);
    assert false, 'A : a publié au nom de B';
  exception when insufficient_privilege then null; end;
  reset role;

  -- ---------- 3. B ne voit pas l'annonce en vérification ----------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.listings where id = annonce; assert n = 0, 'B : voit une annonce en vérification';
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.listings where id = annonce; assert n = 0, 'visiteur : voit une annonce en vérification';
  reset role;

  -- ---------- 4. Le modérateur valide ----------
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.listings set statut = 'en_ligne', publie_le = now(), expire_le = now() + interval '60 days' where id = annonce;
  get diagnostics n = row_count; assert n = 1, 'modérateur : validation impossible';
  reset role;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.listings where id = annonce; assert n = 1, 'visiteur : ne voit pas l''annonce en ligne';
  reset role;

  -- ---------- 5. B contacte A ----------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.conversations (annonce_id, acheteur_id, vendeur_id) values (annonce, b, a) returning id into conv;
  insert into public.messages (conversation_id, auteur_id, contenu) values (conv, b, 'Salam, toujours disponible ?');
  insert into public.favorites (membre_id, annonce_id) values (b, annonce);
  reset role;

  -- ---------- 6. C ne voit rien de la discussion ----------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.conversations; assert n = 0, 'C : voit la discussion de A et B';
  select count(*) into n from public.messages; assert n = 0, 'C : lit les messages de A et B';
  select count(*) into n from public.favorites; assert n = 0, 'C : voit les favoris de B';
  begin
    insert into public.messages (conversation_id, auteur_id, contenu) values (conv, c, 'intrusion');
    assert false, 'C : a écrit dans la discussion de A et B';
  exception when insufficient_privilege then null; end;
  reset role;

  -- ---------- 7. A lit, puis bloque B ----------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.messages where conversation_id = conv; assert n = 1, 'A : ne lit pas le message de B';
  begin
    update public.messages set contenu = 'modifié' where conversation_id = conv;
    assert false, 'A : a modifié le message de B';
  exception when raise_exception then null; end;
  insert into public.blocks (membre_id, bloque_id) values (a, b);
  reset role;

  -- ---------- 8. B bloqué ne peut plus écrire, et ne le sait pas ----------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.blocks; assert n = 0, 'B : voit qu''il est bloqué';
  begin
    insert into public.messages (conversation_id, auteur_id, contenu) values (conv, b, 'encore moi');
    assert false, 'B : a écrit alors qu''il est bloqué';
  exception when insufficient_privilege then null; end;
  reset role;

  -- ---------- 9. Signalement anonyme ----------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.reports (auteur_id, annonce_id, motif) values (c, annonce, 'arnaque');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.reports; assert n = 0, 'A : voit qui l''a signalé';
  reset role;

  -- ---------- 10. Inscription : pas de profil sans numéro de téléphone ni charte ----------
  insert into auth.users (id, instance_id, aud, role)
    values (d, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.profiles (id, nom_affiche, wilaya_code, ville, charte_version) values (d, 'Abou Test D', 16, 'Alger', 1);
    assert false, 'D : profil créé sans numéro de téléphone';
  exception when raise_exception then null; end;
  reset role;
  update auth.users set phone = '213555990001' where id = d;
  set local role authenticated;
  begin
    insert into public.profiles (id, nom_affiche, wilaya_code, ville) values (d, 'Abou Test D', 16, 'Alger');
    assert false, 'D : profil créé sans accepter la charte';
  exception when raise_exception then null; end;
  begin
    insert into public.profiles (id, nom_affiche, wilaya_code, ville, charte_version) values (d, 'Abou Test D', 16, '  ', 1);
    assert false, 'D : profil créé sans ville';
  exception when raise_exception then null; end;
  insert into public.profiles (id, nom_affiche, wilaya_code, ville, charte_version, role, telephone_verifie)
    values (d, 'Abou Test D', 16, 'Alger', 1, 'admin', true) returning role, telephone_verifie into t, ok;
  assert t = 'membre', 'D : a pu se créer un profil admin';
  assert not ok, 'D : a pu se déclarer « téléphone vérifié » sans SMS';
  select count(*) into n from public.profiles where id = d and charte_acceptee_le is not null; assert n = 1, 'D : date de la charte absente';
  update public.profiles set avatar = 7 where id = d;
  get diagnostics n = row_count; assert n = 1, 'D : ne peut pas choisir son image de profil';
  reset role;

  -- ---------- 11. Annonces : prix incohérent et type imposé par la catégorie ----------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
      values (a, 'vente', 'vehicules', 'Voiture à 42 DA', 42, 16);
    assert false, 'A : voiture à 42 DA acceptée';
  exception when raise_exception then null; end;
  begin
    insert into public.listings (auteur_id, type, categorie, sous_categorie_id, titre, prix_da, wilaya_code)
      values (a, 'vente', 'electro', (select id from public.subcategories where categorie = 'vehicules' limit 1), 'Mauvaise sous-catégorie', 45000, 16);
    assert false, 'A : sous-catégorie d''une autre catégorie acceptée';
  exception when raise_exception then null; end;
  insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
    values (a, 'vente', 'dons', 'Lot de vêtements enfant', 5000, 16) returning type, prix_da::text into t, procedure_texte;
  assert t = 'don' and procedure_texte = '0', 'A : un don n''est pas gratuit';
  reset role;

  -- ---------- 12. Mots interdits ----------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
      values (a, 'vente', 'electro', 'Guitare électrique', 45000, 16);
    assert false, 'A : mot interdit (guitare) accepté';
  exception when raise_exception then null; end;
  begin
    insert into public.listings (auteur_id, type, categorie, titre, description, prix_da, wilaya_code)
      values (a, 'vente', 'electro', 'Téléviseur', 'بيع بالتقسيط مع فائدة', 45000, 16);
    assert false, 'A : mot interdit arabe (فائدة) accepté';
  exception when raise_exception then null; end;
  begin
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
      values (a, 'vente', 'electro', 'Agence de location', 45000, 16);
    assert false, 'A : particulier écrivant « agence » accepté';
  exception when raise_exception then null; end;
  insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code)
    values (a, 'vente', 'electro', 'Vélo vintage', 45000, 16);
  reset role;

  -- ---------- 13. Location : totaux de la recherche façon Booking ----------
  declare
    l1 uuid; l2 uuid; v1 uuid; res record; nb int;
  begin
    -- Données préparées « côté serveur » (sans utilisateur connecté), comme le ferait la modération.
    perform set_config('request.jwt.claims', '', true);
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, caracteristiques)
      values (a, 'location', 'immobilier', 'F3 test', 5000, 16, 'en_ligne', '{"type":"F3","personnes":4}') returning id into l1;
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, caracteristiques)
      values (a, 'location', 'immobilier', 'Studio test', 50000, 16, 'en_ligne', '{"type":"Studio","personnes":2}') returning id into l2;
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, caracteristiques)
      values (a, 'location', 'vehicules', 'Citadine test', 4000, 16, 'en_ligne', '{"type_vehicule":"Citadine","boite":"Manuelle","places":"5"}') returning id into v1;
    insert into public.listing_rates (annonce_id, unite, prix_da) values
      (l1, 'nuit', 5000), (l1, 'mois', 60000), (l1, '6_mois', 300000), (l2, 'mois', 50000), (v1, 'jour', 4000), (v1, 'semaine', 25000);
    insert into public.availability (annonce_id, debut, fin) values
      (l1, '2030-12-01', '2031-12-31'), (l2, '2030-12-01', '2031-12-31'), (v1, '2030-12-01', '2031-12-31');
    begin
      insert into public.listing_rates (annonce_id, unite, prix_da) values (v1, 'nuit', 4000);
      assert false, 'tarif « nuit » accepté pour un véhicule';
    exception when raise_exception then null; end;
    begin
      insert into public.listing_rates (annonce_id, unite, prix_da) values (l2, 'nuit', 10);
      assert false, 'tarif incohérent (10 DA la nuit) accepté';
    exception when raise_exception then null; end;

    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    -- 3 nuits : 3 × 5 000 = 15 000 ; studio au mois seulement : 1 mois = 50 000
    select total into res from public.chercher_locations('logement', '2030-12-10', '2030-12-13', 'dates') where annonce_id = l1;
    assert res.total = 15000, 'F3, 3 nuits : ' || res.total;
    select total into res from public.chercher_locations('logement', '2030-12-10', '2030-12-13', 'dates') where annonce_id = l2;
    assert res.total = 50000, 'Studio, 3 nuits au tarif mensuel : ' || res.total;
    -- 6 mois : tarif 6 mois (300 000) ; sinon 6 × mensuel (300 000)
    select total into res from public.chercher_locations('logement', '2030-12-10', null, '6_mois') where annonce_id = l1;
    assert res.total = 300000, 'F3, 6 mois : ' || res.total;
    select total into res from public.chercher_locations('logement', '2030-12-10', null, '6_mois') where annonce_id = l2;
    assert res.total = 300000, 'Studio, 6 mois : ' || res.total;
    -- 1 an sans tarif annuel : 12 × mensuel
    select total into res from public.chercher_locations('logement', '2030-12-10', null, '1_an') where annonce_id = l1;
    assert res.total = 720000, 'F3, 1 an : ' || res.total;
    -- véhicule 3 jours : 3 × 4 000
    select total into res from public.chercher_locations('vehicule', '2030-12-10', '2030-12-12', 'dates') where annonce_id = v1;
    assert res.total = 12000, 'Citadine, 3 jours : ' || res.total;
    -- pas libre au-delà du calendrier
    select count(*) into nb from public.chercher_locations('logement', '2031-08-01', null, '6_mois');
    assert nb = 0, 'bien proposé hors de ses disponibilités';
    -- budget, personnes, type
    select count(*) into nb from public.chercher_locations('logement', '2030-12-10', null, '1_an', 16::smallint, null, null, null, null, 650000);
    assert nb = 1, 'budget 650 000 sur 1 an : ' || nb;
    reset role;
    -- Un logement qui n'indique pas sa capacité n'est pas écarté (correction après le test de Yanis).
    perform set_config('request.jwt.claims', '', true);
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, caracteristiques)
      values (a, 'location', 'immobilier', 'F2 sans capacité', 50000, 31, 'en_ligne', '{"type":"F2"}') returning id into l2;
    insert into public.listing_rates (annonce_id, unite, prix_da) values (l2, 'mois', 40000);
    insert into public.availability (annonce_id, debut, fin) values (l2, '2030-12-01', '2031-12-31');
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    select count(*) into nb from public.chercher_locations('logement', '2030-12-10', null, '6_mois', 16::smallint, null, 3);
    assert nb = 1, 'au moins 3 personnes à Alger : ' || nb;
    select count(*) into nb from public.chercher_locations('logement', '2030-12-10', null, '6_mois', 31::smallint, null, 3);
    assert nb = 1, 'logement sans capacité indiquée écarté : ' || nb;
    select count(*) into nb from public.chercher_locations('logement', '2030-12-10', null, '6_mois', 16::smallint, array['Studio']);
    assert nb = 1, 'type Studio : ' || nb;
    select count(*) into nb from public.chercher_locations('vehicule', '2030-12-10', '2030-12-12', 'dates', null, null, null, 'Automatique');
    assert nb = 0, 'boîte automatique : ' || nb;
    reset role;
  end;

  -- ---------- 14. Messagerie : coordonnées masquées, liste des discussions privée ----------
  declare
    texte text; nb2 int;
  begin
    -- A écrit (B, bloqué par A plus haut, ne peut plus écrire).
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.messages (conversation_id, auteur_id, contenu)
      values (conv, a, 'Appelez le 0555 12 34 56 ou ecrivez a test@exemple.com, prix 45 000 DA')
      returning contenu into texte;
    assert texte = 'Appelez le ••• ou ecrivez a •••, prix 45 000 DA', 'coordonnées non masquées : ' || texte;
    select count(*) into nb2 from public.mes_discussions(); assert nb2 = 1, 'A : sa discussion absente';
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into nb2 from public.mes_discussions(); assert nb2 = 0, 'C : voit des discussions qui ne le concernent pas';
    reset role;
  end;

  -- ---------- 15. Permis : envoyé au seul loueur, statut décidé par lui ----------
  declare
    v2 uuid; doc uuid; nb3 int; st text;
  begin
    perform set_config('request.jwt.claims', '', true);
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, permis_exige)
      values (a, 'location', 'vehicules', 'Berline avec permis', 5000, 16, 'en_ligne', true) returning id into v2;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.private_documents (expediteur_id, destinataire_id, annonce_id, fichier, efface_le)
      values (c, a, v2, a::text || '/' || c::text || '/permis.jpg', now() + interval '10 days') returning id into doc;
    begin
      insert into public.private_documents (expediteur_id, destinataire_id, annonce_id, fichier, efface_le)
        values (c, a, annonce, a::text || '/' || c::text || '/permis2.jpg', now() + interval '10 days');
      assert false, 'C : permis envoyé pour une annonce qui ne le demande pas';
    exception when raise_exception then null; end;
    update public.private_documents set statut = 'accepte' where id = doc;
    get diagnostics nb3 = row_count; assert nb3 = 0, 'C : a accepté son propre permis';
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into nb3 from public.private_documents; assert nb3 = 0, 'B : voit un permis qui ne le concerne pas';
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.private_documents set statut = 'accepte' where id = doc returning statut into st;
    assert st = 'accepte', 'A (loueur) : ne peut pas accepter le permis';
    reset role;
  end;

  raise exception 'TESTS_OK';
end $$;
