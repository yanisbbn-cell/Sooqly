-- Sooqly – décision de Yanis du 17 novembre 2026 : la catégorie « Famille » ne contient que des articles
-- pour les enfants ; elle devient « Bébé et enfants » (la clé « famille » ne change pas : annonces, alertes et
-- filtres existants restent valables).
update public.categories set nom_fr = 'Bébé et enfants', nom_ar = 'الرضّع والأطفال', nom_court_fr = null
where cle = 'famille';
