-- Sooqly – étape 4 : caractéristiques de chaque catégorie (reprises de la maquette),
-- exemple de titre et conseil de description, et contrôle du prix par la base.

alter table public.categories
  add column titre_exemple jsonb not null default '{}'::jsonb,
  add column conseil_description jsonb not null default '{}'::jsonb;

update public.categories set criteres = '[{"cle":"type","fr":"Type de bien","ar":"نوع العقار","type":"choix","options":[{"v":"Studio","fr":"Studio","ar":"استوديو"},{"v":"F2","fr":"F2","ar":"F2"},{"v":"F3","fr":"F3","ar":"F3"},{"v":"F4 et plus","fr":"F4 et plus","ar":"F4 فأكثر"},{"v":"Maison","fr":"Maison","ar":"منزل"},{"v":"Local","fr":"Local","ar":"محل"}]},{"cle":"surface","fr":"Surface (m²)","ar":"المساحة (م²)","type":"nombre"},{"cle":"etage","fr":"Étage","ar":"الطابق","type":"nombre"},{"cle":"meuble","fr":"Meublé","ar":"مفروش","type":"choix","options":[{"v":"Oui","fr":"Oui","ar":"نعم"},{"v":"Non","fr":"Non","ar":"لا"}]}]'::jsonb, titre_exemple = '{"fr":"Ex. : F3 meublé proche mosquée","ar":"مثال: شقة F3 مفروشة قرب المسجد"}'::jsonb, conseil_description = '{"fr":"quartier, étage, exposition, charges, conditions de visite","ar":"الحي، الطابق، الواجهة، الأعباء، شروط المعاينة"}'::jsonb where cle = 'immobilier';
update public.categories set criteres = '[{"cle":"marque","fr":"Marque","ar":"العلامة","type":"texte"},{"cle":"modele","fr":"Modèle","ar":"الطراز","type":"texte"},{"cle":"annee","fr":"Année","ar":"سنة الصنع","type":"nombre"},{"cle":"km","fr":"Kilométrage (km)","ar":"المسافة المقطوعة (كم)","type":"nombre"},{"cle":"carbu","fr":"Carburant","ar":"الوقود","type":"choix","options":[{"v":"Essence","fr":"Essence","ar":"بنزين"},{"v":"Diesel","fr":"Diesel","ar":"ديزل"},{"v":"GPL / Sirghaz","fr":"GPL / Sirghaz","ar":"سيرغاز"},{"v":"Hybride","fr":"Hybride","ar":"هجينة"},{"v":"Électrique","fr":"Électrique","ar":"كهربائية"}]},{"cle":"boite","fr":"Boîte de vitesses","ar":"علبة السرعات","type":"choix","options":[{"v":"Manuelle","fr":"Manuelle","ar":"يدوية"},{"v":"Automatique","fr":"Automatique","ar":"آلية"}]},{"cle":"portes","fr":"Nombre de portes","ar":"عدد الأبواب","type":"choix","options":[{"v":"3","fr":"3","ar":"3"},{"v":"5","fr":"5","ar":"5"}]},{"cle":"places","fr":"Nombre de places","ar":"عدد المقاعد","type":"choix","options":[{"v":"2","fr":"2","ar":"2"},{"v":"3","fr":"3","ar":"3"},{"v":"5","fr":"5","ar":"5"},{"v":"7","fr":"7","ar":"7"}]}]'::jsonb, titre_exemple = '{"fr":"Ex. : Citadine diesel 2019","ar":"مثال: سيارة صغيرة ديزل 2019"}'::jsonb, conseil_description = '{"fr":"entretien, contrôle technique, options, défauts éventuels","ar":"الصيانة، المراقبة التقنية، التجهيزات، العيوب إن وُجدت"}'::jsonb where cle = 'vehicules';
update public.categories set criteres = '[{"cle":"ref","fr":"Référence","ar":"المرجع","type":"texte"},{"cle":"compat","fr":"Véhicules compatibles","ar":"المركبات المتوافقة","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Réfrigérateur combiné","ar":"مثال: ثلاجة بمجمّد"}'::jsonb, conseil_description = '{"fr":"référence exacte, véhicules compatibles, état de fonctionnement","ar":"المرجع الدقيق، المركبات المتوافقة، حالة الاشتغال"}'::jsonb where cle = 'pieces';
update public.categories set criteres = '[{"cle":"marque","fr":"Marque","ar":"العلامة","type":"texte"},{"cle":"modele","fr":"Modèle","ar":"الطراز","type":"texte"},{"cle":"achat","fr":"Année d’achat","ar":"سنة الشراء","type":"nombre"},{"cle":"garantie","fr":"Sous garantie","ar":"تحت الضمان","type":"choix","options":[{"v":"Oui","fr":"Oui","ar":"نعم"},{"v":"Non","fr":"Non","ar":"لا"}]}]'::jsonb, titre_exemple = '{"fr":"Ex. : Réfrigérateur combiné","ar":"مثال: ثلاجة بمجمّد"}'::jsonb, conseil_description = '{"fr":"marque, âge, consommation, défauts éventuels","ar":"العلامة، العمر، الاستهلاك، العيوب إن وُجدت"}'::jsonb where cle = 'electro';
update public.categories set criteres = '[{"cle":"matiere","fr":"Matière principale","ar":"المادة الأساسية","type":"choix","options":[{"v":"Bois","fr":"Bois","ar":"خشب"},{"v":"Métal","fr":"Métal","ar":"معدن"},{"v":"Tissu","fr":"Tissu","ar":"قماش"},{"v":"Cuir","fr":"Cuir","ar":"جلد"},{"v":"Similicuir","fr":"Similicuir","ar":"جلد اصطناعي"},{"v":"Verre","fr":"Verre","ar":"زجاج"}]},{"cle":"couleur","fr":"Couleur","ar":"اللون","type":"texte"},{"cle":"dims","fr":"Dimensions (L × l × h)","ar":"الأبعاد (طول × عرض × ارتفاع)","type":"texte"},{"cle":"places","fr":"Nombre de places (canapés)","ar":"عدد المقاعد (للأرائك)","type":"choix","options":[{"v":"1","fr":"1","ar":"1"},{"v":"2","fr":"2","ar":"2"},{"v":"3","fr":"3","ar":"3"},{"v":"4","fr":"4","ar":"4"},{"v":"5 et +","fr":"5 et +","ar":"5 فأكثر"}]},{"cle":"montage","fr":"Remise","ar":"طريقة التسليم","type":"choix","options":[{"v":"Monté","fr":"Monté","ar":"مركّب"},{"v":"Démonté","fr":"Démonté","ar":"مفكّك"}]}]'::jsonb, titre_exemple = '{"fr":"Ex. : Canapé d’angle 5 places","ar":"مثال: أريكة زاوية بخمسة مقاعد"}'::jsonb, conseil_description = '{"fr":"dimensions, matière, état du tissu ou du bois, livraison ou retrait","ar":"الأبعاد، المادة، حالة القماش أو الخشب، التوصيل أو الاستلام"}'::jsonb where cle = 'ameublement';
update public.categories set criteres = '[{"cle":"marque","fr":"Marque","ar":"العلامة","type":"texte"},{"cle":"modele","fr":"Modèle","ar":"الطراز","type":"texte"},{"cle":"stockage","fr":"Stockage","ar":"التخزين","type":"texte"},{"cle":"ram","fr":"Mémoire vive","ar":"الذاكرة العشوائية","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Réfrigérateur combiné","ar":"مثال: ثلاجة بمجمّد"}'::jsonb, conseil_description = '{"fr":"caractéristiques, état de la batterie, accessoires fournis","ar":"المواصفات، حالة البطارية، الملحقات المرفقة"}'::jsonb where cle = 'info';
update public.categories set criteres = '[{"cle":"taille","fr":"Taille","ar":"المقاس","type":"texte"},{"cle":"couleur","fr":"Couleur","ar":"اللون","type":"texte"},{"cle":"matiere","fr":"Matière","ar":"القماش","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Réfrigérateur combiné","ar":"مثال: ثلاجة بمجمّد"}'::jsonb, conseil_description = '{"fr":"taille, matière, nombre de pièces","ar":"المقاس، القماش، عدد القطع"}'::jsonb where cle = 'vetements';
update public.categories set criteres = '[{"cle":"age","fr":"Âge de l’enfant","ar":"عمر الطفل","type":"choix","options":[{"v":"0–6 mois","fr":"0–6 mois","ar":"0–6 أشهر"},{"v":"6–12 mois","fr":"6–12 mois","ar":"6–12 شهرًا"},{"v":"1–3 ans","fr":"1–3 ans","ar":"1–3 سنوات"},{"v":"3–6 ans","fr":"3–6 ans","ar":"3–6 سنوات"},{"v":"6–12 ans","fr":"6–12 ans","ar":"6–12 سنة"}]},{"cle":"marque","fr":"Marque","ar":"العلامة","type":"texte"},{"cle":"dims","fr":"Taille ou dimensions","ar":"المقاس أو الأبعاد","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Poussette 3 en 1","ar":"مثال: عربة أطفال 3 في 1"}'::jsonb, conseil_description = '{"fr":"âge conseillé, normes de sécurité, pièces manquantes","ar":"العمر المناسب، معايير السلامة، القطع الناقصة"}'::jsonb where cle = 'famille';
update public.categories set criteres = '[{"cle":"zone","fr":"Zone d’intervention","ar":"منطقة العمل","type":"texte"},{"cle":"horaires","fr":"Disponibilités","ar":"أوقات التوفر","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Réfrigérateur combiné","ar":"مثال: ثلاجة بمجمّد"}'::jsonb, conseil_description = '{"fr":"zone, horaires, expérience, matériel fourni","ar":"منطقة العمل، الأوقات، الخبرة، العتاد المتوفر"}'::jsonb where cle = 'services';
update public.categories set criteres = '[{"cle":"quantite","fr":"Quantité","ar":"الكمية","type":"texte"},{"cle":"retrait","fr":"Conditions de retrait","ar":"شروط الاستلام","type":"texte"}]'::jsonb, titre_exemple = '{"fr":"Ex. : Lot de vêtements enfant","ar":"مثال: مجموعة ملابس أطفال"}'::jsonb, conseil_description = '{"fr":"quantité, état, conditions de retrait","ar":"الكمية، الحالة، شروط الاستلام"}'::jsonb where cle = 'dons';

-- Contrôle de l'annonce par la base, en plus de l'appli :
--   - la catégorie impose le type (Dons → don gratuit, Services → service) ;
--   - la sous-catégorie appartient bien à la catégorie ;
--   - le prix est cohérent avec la catégorie (fourchettes de « categories.fourchettes_prix ») ;
--   - seule la modération met en ligne, refuse ou sponsorise.
create or replace function prive.proteger_annonce()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fourchettes jsonb;
  bornes jsonb;
begin
  new.modifie_le := now();

  -- Règles de contenu : valables pour tout le monde, modération comprise.
  if new.categorie = 'dons' then
    new.type := 'don';
    new.prix_da := 0;
  elsif new.categorie = 'services' then
    new.type := 'service';
  elsif new.type in ('don', 'service') then
    raise exception 'Type d''annonce incompatible avec la catégorie' using errcode = 'P0001';
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
  if new.statut is distinct from old.statut and not (
       (old.statut = 'en_ligne' and new.statut in ('reserve', 'vendu', 'loue'))
    or (old.statut = 'reserve' and new.statut in ('en_ligne', 'vendu', 'loue'))
    or (old.statut in ('refuse', 'expire') and new.statut = 'verification')
  ) then
    raise exception 'Changement de statut non autorisé';
  end if;
  return new;
end $$;
