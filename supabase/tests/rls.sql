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

  raise exception 'TESTS_OK';
end $$;
