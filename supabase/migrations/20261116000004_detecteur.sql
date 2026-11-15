-- Sooqly – étape 5 : fichiers du détecteur d'images (bibliothèque TensorFlow.js et modèle COCO-SSD lite),
-- rangés dans un seau public en lecture seule, pour ne dépendre d'aucun site extérieur.
-- Ils sont déposés par Claude Code avec la clé de service (aucun membre ne peut y écrire : pas de règle d'écriture).
insert into storage.buckets (id, name, public)
values ('detecteur', 'detecteur', true)
on conflict (id) do nothing;
