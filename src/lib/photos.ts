import * as ImagePicker from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

import type { Analyse } from './detecteur/commun';
import { supabase } from './supabase';

/** Photos des annonces : jusqu'à 10, allégées avant l'envoi, rangées dans le seau « photos-annonces ». */

export const MAX_PHOTOS = 10;
const SEAU = 'photos-annonces';

export type PhotoLocale = {
  /** Case choisie (0 à 9) : l'angle conseillé correspondant. */
  emplacement: number;
  uri: string;
  /** JPEG allégé (1280 px de large au plus), en base64, prêt à envoyer. */
  base64: string;
  analyse: Analyse | null;
  /** Photo déjà enregistrée (modification d'une annonce) : son chemin dans le seau. */
  fichier?: string;
  /** Taille d'origine (pixels), pour les conseils : photo petite ou prise en hauteur. */
  largeur?: number;
  hauteur?: number;
};

/** Conseils sur une photo : trop petite (risque de flou) ou en hauteur (coupée en haut et en bas sur les cartes). */
export function conseilsPhoto(p: Pick<PhotoLocale, 'largeur' | 'hauteur'>): ('petite' | 'verticale')[] {
  if (!p.largeur || !p.hauteur) return [];
  const c: ('petite' | 'verticale')[] = [];
  if (Math.min(p.largeur, p.hauteur) < 600) c.push('petite');
  if (p.hauteur > p.largeur * 1.15) c.push('verticale');
  return c;
}

export type Source = 'camera' | 'galerie';

/** Ouvre l'appareil photo ou la galerie. Renvoie null si annulé ou si l'accès est refusé. */
export async function prendrePhoto(source: Source): Promise<string | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false };
  const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (r.canceled || !r.assets[0]) return null;
  return r.assets[0].uri;
}

/**
 * Version allégée pour l'envoi (1280 px de large au plus, jamais agrandie) et petite version pour le détecteur (400 px).
 * Renvoie aussi la taille d'origine.
 */
export async function preparer(uri: string): Promise<{ uri: string; base64: string; petite: string; largeur: number; hauteur: number }> {
  const origine = await manipulateAsync(uri, []);
  const reduire = origine.width > 1280 ? [{ resize: { width: 1280 } }] : [];
  const grande = await manipulateAsync(uri, reduire, { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  const petite = await manipulateAsync(uri, [{ resize: { width: 400 } }], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { uri: grande.uri, base64: grande.base64 ?? '', petite: petite.base64 ?? '', largeur: origine.width, hauteur: origine.height };
}

export const urlPhoto = (chemin: string) => supabase.storage.from(SEAU).getPublicUrl(chemin).data.publicUrl;

/**
 * Envoie les photos d'une annonce déjà créée. La première de la liste devient la photo principale (ordre 1).
 * Renvoie false si une photo n'a pas pu être envoyée.
 */
export async function envoyerPhotos(
  auteurId: string,
  annonceId: string,
  photos: PhotoLocale[],
  angles: string[],
  /** Nombre de photos déjà enregistrées avant celles-ci (modification). */
  depart = 0,
): Promise<boolean> {
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]!;
    const chemin = `${auteurId}/${annonceId}/${Date.now().toString(36)}-${depart + i + 1}.jpg`;
    const envoi = await supabase.storage.from(SEAU).upload(chemin, decode(p.base64), { contentType: 'image/jpeg', upsert: false });
    if (envoi.error) return false;
    const { error } = await supabase.from('listing_photos').insert({
      annonce_id: annonceId,
      fichier: chemin,
      ordre: depart + i + 1,
      angle: angles[p.emplacement] ?? null,
      resultat_detecteur: p.analyse ? { interdit: p.analyse.interdit, objets: p.analyse.objets, erreur: !!p.analyse.erreur } : null,
    });
    if (error) return false;
  }
  return true;
}

/**
 * Modification d'une annonce : retire les photos enlevées (fichiers compris), resserre l'ordre des photos gardées,
 * puis envoie les nouvelles à la suite. La première de la liste reste la photo principale.
 */
export async function enregistrerPhotosModifiees(
  auteurId: string,
  annonceId: string,
  photos: PhotoLocale[],
  angles: string[],
  anciennes: { fichier: string; ordre: number }[],
): Promise<boolean> {
  const gardees = new Set(photos.filter((p) => p.fichier).map((p) => p.fichier!));
  const retirees = anciennes.filter((a) => !gardees.has(a.fichier)).map((a) => a.fichier);
  if (retirees.length) {
    const { error } = await supabase.from('listing_photos').delete().eq('annonce_id', annonceId).in('fichier', retirees);
    if (error) return false;
    await supabase.storage.from(SEAU).remove(retirees);
  }
  // Ordre croissant : chaque photo gardée descend vers une place déjà libérée (pas de doublon d'ordre).
  const restantes = anciennes.filter((a) => gardees.has(a.fichier)).sort((x, y) => x.ordre - y.ordre);
  for (let i = 0; i < restantes.length; i++) {
    if (restantes[i]!.ordre === i + 1) continue;
    const { error } = await supabase
      .from('listing_photos')
      .update({ ordre: i + 1 })
      .eq('annonce_id', annonceId)
      .eq('fichier', restantes[i]!.fichier);
    if (error) return false;
  }
  return envoyerPhotos(auteurId, annonceId, photos.filter((p) => !p.fichier), angles, restantes.length);
}
