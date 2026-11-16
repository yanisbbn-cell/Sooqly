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

  -- ---------- 16. Confiance : vente déclarée, notes, badge, signalement, blocages ----------
  declare
    tx uuid; nb4 int; st2 text; j json;
  begin
    perform set_config('request.jwt.claims', '', true);
    update public.listings set statut = 'en_ligne' where id = annonce;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      insert into public.transactions (annonce_id, acheteur_id, vendeur_id) values (annonce, c, a);
      assert false, 'A : vente déclarée à un membre sans discussion';
    exception when raise_exception then null; end;
    insert into public.transactions (annonce_id, acheteur_id, vendeur_id) values (annonce, b, a) returning id into tx;
    select statut into st2 from public.listings where id = annonce; assert st2 = 'vendu', 'annonce non passée vendue : ' || st2;
    begin
      insert into public.transactions (annonce_id, acheteur_id, vendeur_id) values (annonce, b, a);
      assert false, 'A : vente déclarée deux fois';
    exception when raise_exception then null; end;
    insert into public.ratings (transaction_id, auteur_id, cible_id, role, note, critere_1, critere_2, critere_3)
      values (tx, a, b, 'vendeur', 4, 4, 5, 4);
    select count(*) into nb4 from public.mes_blocages(); assert nb4 = 1, 'A : liste des blocages : ' || nb4;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      insert into public.ratings (transaction_id, auteur_id, cible_id, role, note, critere_1, critere_2, critere_3)
        values (tx, c, a, 'acheteur', 1, 1, 1, 1);
      assert false, 'C : a noté une transaction qui ne le concerne pas';
    exception when insufficient_privilege then null; end;
    select count(*) into nb4 from public.transactions_a_noter(); assert nb4 = 0, 'C : voit des transactions à noter';
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into nb4 from public.transactions_a_noter(); assert nb4 = 1, 'B : transaction à noter absente';
    insert into public.ratings (transaction_id, auteur_id, cible_id, role, note, critere_1, critere_2, critere_3)
      values (tx, b, a, 'acheteur', 4, 4, 4, 4);
    update public.ratings set note = 5, critere_1 = 5 where transaction_id = tx and auteur_id = b;
    get diagnostics nb4 = row_count; assert nb4 = 1, 'B : note non modifiable sous 48 h';
    insert into public.reports (auteur_id, membre_vise_id, motif) values (b, a, 'faux_profil');
    begin
      insert into public.reports (auteur_id, membre_vise_id, motif) values (b, a, 'autre');
      assert false, 'B : même membre signalé deux fois';
    exception when unique_violation then null; end;
    select count(*) into nb4 from public.reports; assert nb4 = 0, 'B : lit les signalements';
    reset role;
    perform set_config('request.jwt.claims', '', true);
    update public.settings set seuil_badge = 1;
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    select count(*) into nb4 from public.vendeurs_valides(array[a, b]); assert nb4 = 1, 'badge : ' || nb4;
    j := public.profil_membre(a);
    assert (j->>'ventes_5')::int = 1 and (j->>'moyenne')::numeric = 5, 'profil : ' || j::text;
    reset role;
  end;

  -- ---------- 17. Mes annonces : modification, republication, vues, statistiques ----------
  declare
    v3 uuid; st3 text; nb5 int; exp3 timestamptz;
  begin
    perform set_config('request.jwt.claims', '', true);
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, publie_le, expire_le)
      values (a, 'vente', 'electro', 'Frigo test', 30000, 16, 'en_ligne', now(), now() + interval '60 days') returning id into v3;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.listings set prix_da = 28000 where id = v3 returning statut into st3;
    assert st3 = 'en_ligne', 'prix modifié : ' || st3;
    update public.listings set titre = 'Frigo test modifié' where id = v3 returning statut into st3;
    assert st3 = 'verification', 'titre modifié sans nouvelle vérification : ' || st3;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    update public.listings set statut = 'expire' where id = v3;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.listings set statut = 'en_ligne' where id = v3 returning statut, expire_le into st3, exp3;
    assert st3 = 'en_ligne' and exp3 > now() + interval '59 days', 'republication : ' || st3;
    insert into public.listing_photos (annonce_id, fichier, ordre) values (v3, a::text || '/' || v3::text || '/x.jpg', 1);
    select statut into st3 from public.listings where id = v3;
    assert st3 = 'verification', 'photo ajoutée sans nouvelle vérification : ' || st3;
    perform public.compter_vue(v3);  -- l'auteur ne compte pas (et l'annonce est en vérification)
    reset role;
    perform set_config('request.jwt.claims', '', true);
    update public.listings set statut = 'en_ligne' where id = v3;
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    perform public.compter_vue(v3);
    perform public.compter_vue(v3);
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select s.vues into nb5 from public.stats_mes_annonces() s where s.annonce_id = v3;
    assert nb5 = 2, 'vues : ' || nb5;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into nb5 from public.stats_mes_annonces(); assert nb5 = 0, 'C : voit les statistiques de A';
    reset role;
    perform set_config('request.jwt.claims', '', true);
    update public.listings set expire_le = now() - interval '1 minute' where id = v3;
    perform prive.expirer_annonces();
    select statut into st3 from public.listings where id = v3; assert st3 = 'expire', 'expiration : ' || st3;
  end;

  -- ---------- 18. Favoris : prix d'ajout gardé, réservé à son propriétaire ----------
  declare
    v4 uuid; px bigint; nb6 int;
  begin
    perform set_config('request.jwt.claims', '', true);
    insert into public.listings (auteur_id, type, categorie, titre, prix_da, wilaya_code, statut, publie_le, expire_le)
      values (a, 'vente', 'electro', 'Four test', 20000, 16, 'en_ligne', now(), now() + interval '60 days') returning id into v4;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.favorites (membre_id, annonce_id, alerte_prix, prix_ajout_da) values (c, v4, true, 1) returning prix_ajout_da into px;
    assert px = 20000, 'prix d''ajout : ' || px;
    update public.favorites set prix_ajout_da = 99999, alerte_prix = false where annonce_id = v4 returning prix_ajout_da into px;
    assert px = 20000, 'prix d''ajout modifié : ' || px;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.listings set prix_da = 18000 where id = v4;
    select count(*) into nb6 from public.favorites; assert nb6 = 0, 'A : voit les favoris des autres';
    reset role;
    select count(*) into nb6 from public.listing_prices where annonce_id = v4 and nouveau_prix_da = 18000;
    assert nb6 = 1, 'baisse de prix non historisée';
  end;

  raise exception 'TESTS_OK';
end $$;
