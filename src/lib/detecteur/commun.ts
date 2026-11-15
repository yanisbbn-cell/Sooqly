/**
 * Détecteur d'images de Sooqly (option gratuite, sans compte ni carte bancaire).
 * Un modèle libre de reconnaissance d'objets (COCO-SSD, TensorFlow.js) analyse chaque photo
 * sur l'appareil, avant l'envoi. Il repère personnes et animaux : la photo est alors refusée.
 * C'est un premier filet : la modération humaine revoit toujours chaque photo.
 */

/** Classes du modèle qui représentent un être animé (personne, animal, ou peluche). */
export const CLASSES_INTERDITES = new Set([
  'person',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'teddy bear',
]);

/** Seuil de confiance : au-delà, l'objet est considéré comme présent. */
export const SEUIL = 0.4;

export type Objet = { classe: string; score: number };
export type Analyse = { interdit: boolean; objets: Objet[]; erreur?: boolean };

export function interpreter(objets: Objet[]): Analyse {
  const vus = objets.filter((o) => o.score >= SEUIL);
  return { interdit: vus.some((o) => CLASSES_INTERDITES.has(o.classe)), objets: vus };
}

// Bibliothèques et modèle rangés dans notre Supabase (seau public « detecteur »), versions figées.
// Le modèle « lite » pèse environ 18 Mo : téléchargé une fois, puis gardé en cache par le téléphone.
const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/detecteur`;
export const SCRIPTS = [`${BASE}/tfjs-4.22.0/tf.min.js`, `${BASE}/coco-ssd-2.2.3/coco-ssd.min.js`];
export const MODELE = { base: 'lite_mobilenet_v2', modelUrl: `${BASE}/ssdlite_mobilenet_v2/model.json` };
