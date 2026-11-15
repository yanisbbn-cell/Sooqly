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
};

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

/** Version allégée pour l'envoi (1280 px) et petite version pour le détecteur (400 px). */
export async function preparer(uri: string): Promise<{ uri: string; base64: string; petite: string }> {
  const grande = await manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  const petite = await manipulateAsync(uri, [{ resize: { width: 400 } }], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
  return { uri: grande.uri, base64: grande.base64 ?? '', petite: petite.base64 ?? '' };
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
): Promise<boolean> {
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i]!;
    const chemin = `${auteurId}/${annonceId}/${Date.now().toString(36)}-${i + 1}.jpg`;
    const envoi = await supabase.storage.from(SEAU).upload(chemin, decode(p.base64), { contentType: 'image/jpeg', upsert: false });
    if (envoi.error) return false;
    const { error } = await supabase.from('listing_photos').insert({
      annonce_id: annonceId,
      fichier: chemin,
      ordre: i + 1,
      angle: angles[p.emplacement] ?? null,
      resultat_detecteur: p.analyse ? { interdit: p.analyse.interdit, objets: p.analyse.objets, erreur: !!p.analyse.erreur } : null,
    });
    if (error) return false;
  }
  return true;
}
