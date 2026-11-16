-- Annonces d'exemple pour le test réel (étape 14). À effacer avant le lancement (étape 15) :
--   delete from auth.users where phone = '213555000099';
do $$
declare
  ex uuid := gen_random_uuid();
  intro text := 'Annonce d''exemple pour la phase de test de Sooqly. ';
  l uuid;
begin
  if exists (select 1 from auth.users where phone = '213555000099') then
    raise exception 'Les exemples existent déjà';
  end if;
  perform set_config('request.jwt.claims', '', true);
  insert into auth.users (id, instance_id, aud, role, phone)
    values (ex, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '213555000099');
  insert into public.profiles (id, nom_affiche, wilaya_code, ville, avatar, charte_version, charte_acceptee_le)
    values (ex, 'Exemples Sooqly', 16, 'Alger', 12, 1, now());

  insert into public.listings (auteur_id, type, categorie, sous_categorie_id, titre, description, etat, caracteristiques, prix_da, prix_ferme,
    echange_accepte, remise_main_propre, livraison_wilaya, envoi_algerie, wilaya_code, ville, statut, publie_le, expire_le)
  select ex, x.type, x.cat, x.sous, x.titre, intro || x.descr, x.etat, '{}'::jsonb, x.prix, x.ferme, x.echange, x.main, x.livr, x.envoi,
    x.wil, x.ville, 'en_ligne', now() - (x.age || ' hours')::interval, now() + interval '60 days'
  from (values
    ('vente', 'immobilier', 1, 'Appartement F3 lumineux à Bab Ezzouar', 'F3 de 78 m², 3e étage, proche du tramway. Acte et livret foncier.', null, 18500000, false, false, false, false, false, 16, 'Bab Ezzouar', 2),
    ('vente', 'vehicules', 7, 'Renault Clio 4 diesel 2017', 'Clio 4 dCi, 112 000 km, carnet d''entretien à jour, carte grise au nom du vendeur.', null, 2150000, false, true, false, false, false, 9, 'Blida', 5),
    ('vente', 'pieces', 11, 'Lot de 4 pneus Michelin 205/55 R16', 'Pneus été, usure environ 30 %. Vendus ensemble.', 'bon', 32000, false, false, true, false, true, 19, 'Sétif', 8),
    ('vente', 'electro', 17, 'Réfrigérateur Condor 400 L no frost', 'Réfrigérateur combiné, très peu servi, aucune rayure.', 'tres_bon', 65000, true, false, true, true, false, 16, 'Kouba', 11),
    ('vente', 'electro', 18, 'Lave-linge Samsung 8 kg', 'Lave-linge hublot, fonctionne parfaitement, vendu pour cause de déménagement.', 'bon', 48000, false, false, true, true, false, 31, 'Oran', 14),
    ('vente', 'ameublement', 23, 'Salon marocain 6 places avec table', 'Salon traditionnel, tissu bordeaux et or, mousse ferme.', 'tres_bon', 120000, false, true, true, false, false, 13, 'Tlemcen', 20),
    ('vente', 'ameublement', 26, 'Table en bois massif et 6 chaises', 'Table 180 × 90 cm, bois de hêtre, chaises solides.', 'bon', 35000, false, false, true, true, false, 6, 'Béjaïa', 26),
    ('vente', 'info', 34, 'Samsung Galaxy A54 128 Go', 'Téléphone avec boîte et chargeur, batterie en très bon état.', 'tres_bon', 52000, true, false, true, false, true, 16, 'Alger', 30),
    ('vente', 'info', 35, 'Ordinateur portable HP Core i5 8 Go', 'HP ProBook, SSD 256 Go, idéal pour études et bureautique.', 'bon', 68000, false, false, true, false, true, 23, 'Annaba', 36),
    ('vente', 'vetements', 41, 'Qamis blanc taille L, neuf', 'Qamis en coton, jamais porté, avec étiquette.', 'neuf', 3500, true, false, true, false, true, 16, 'Alger', 40),
    ('vente', 'famille', 45, 'Poussette pliable légère', 'Poussette compacte, se plie d''une main, avec housse de pluie.', 'bon', 12000, false, false, true, true, false, 15, 'Tizi Ouzou', 48),
    ('service', 'services', 55, 'Cours de mathématiques BEM et BAC', 'Professeur expérimenté, cours à domicile ou en ligne. Prix par séance d''1 h 30.', null, 1500, true, false, false, false, false, 16, 'Alger', 52),
    ('don', 'dons', 59, 'Don : armoire 2 portes', 'Armoire en bon état à récupérer sur place, il faut la démonter.', 'satisfaisant', 0, true, false, true, false, false, 26, 'Médéa', 60)
  ) as x(type, cat, sous, titre, descr, etat, prix, ferme, echange, main, livr, envoi, wil, ville, age);

  -- Deux locations, avec tarifs et disponibilités.
  insert into public.listings (auteur_id, type, categorie, sous_categorie_id, titre, description, caracteristiques, prix_da, wilaya_code, ville,
    statut, publie_le, expire_le)
    values (ex, 'location', 'immobilier', 1, 'F2 meublé à louer, centre d''Oran', intro || 'F2 meublé de 55 m², climatisé, proche commerces. Location au mois.',
      '{"type": "F2", "personnes": 4}'::jsonb, 45000, 31, 'Oran', 'en_ligne', now() - interval '3 hours', now() + interval '60 days')
    returning id into l;
  insert into public.listing_rates (annonce_id, unite, prix_da) values (l, 'mois', 45000), (l, '6_mois', 250000);
  insert into public.availability (annonce_id, debut, fin) values (l, current_date, current_date + 365);

  insert into public.listings (auteur_id, type, categorie, sous_categorie_id, titre, description, caracteristiques, prix_da, wilaya_code, ville,
    statut, publie_le, expire_le)
    values (ex, 'location', 'vehicules', 7, 'Location Hyundai Accent automatique', intro || 'Hyundai Accent 2020, boîte automatique, climatisée. Location à la journée.',
      '{"type_vehicule": "Berline", "boite": "Automatique", "places": 5}'::jsonb, 6000, 25, 'Constantine', 'en_ligne', now() - interval '6 hours', now() + interval '60 days')
    returning id into l;
  insert into public.listing_rates (annonce_id, unite, prix_da) values (l, 'jour', 6000), (l, 'semaine', 38000);
  insert into public.availability (annonce_id, debut, fin) values (l, current_date, current_date + 180);
end $$;
