import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { decode } from 'base64-arraybuffer';

import { supabase } from './supabase';

/**
 * Étape 14 : retours des testeurs (« Signaler un problème »).
 * Visible seulement dans les versions de test (EXPO_PUBLIC_VERSION_TEST=1, voir eas.json).
 */
export const VERSION_TEST = process.env.EXPO_PUBLIC_VERSION_TEST === '1';

export type Retour = {
  id: number;
  membre_id: string | null;
  message: string;
  ecran: string | null;
  appareil: Record<string, string | number | null>;
  capture: string | null;
  statut: 'nouveau' | 'lu' | 'corrige';
  cree_le: string;
  membre: { nom_affiche: string } | null;
};

function appareil() {
  return {
    systeme: Platform.OS,
    version_systeme: String(Platform.Version ?? ''),
    modele: Device.modelName ?? null,
    marque: Device.brand ?? null,
    appli: Constants.expoConfig?.version ?? null,
    mise_a_jour: Constants.expoConfig?.runtimeVersion ? String(Constants.expoConfig.runtimeVersion) : null,
  };
}

/** Envoie un retour ; la capture (JPEG en base64) n'est jointe que pour un membre connecté. */
export async function envoyerRetour(
  membreId: string | null,
  message: string,
  ecran: string,
  capture: { base64: string } | null,
): Promise<boolean> {
  let chemin: string | null = null;
  if (membreId && capture) {
    chemin = `${membreId}/${Date.now().toString(36)}.jpg`;
    const envoi = await supabase.storage.from('retours').upload(chemin, decode(capture.base64), { contentType: 'image/jpeg' });
    if (envoi.error) chemin = null;
  }
  const { error } = await supabase.from('retours').insert({
    membre_id: membreId,
    message: message.trim(),
    ecran: ecran.trim() || null,
    appareil: appareil(),
    capture: chemin,
  });
  return !error;
}

export async function listerRetours(): Promise<Retour[]> {
  const { data, error } = await supabase
    .from('retours')
    .select('id, membre_id, message, ecran, appareil, capture, statut, cree_le, membre:profiles(nom_affiche)')
    .order('cree_le', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as Retour[];
}

export async function changerStatutRetour(id: number, statut: Retour['statut']) {
  const { error } = await supabase.from('retours').update({ statut }).eq('id', id);
  return !error;
}

export async function lienCapture(chemin: string): Promise<string | null> {
  const { data } = await supabase.storage.from('retours').createSignedUrl(chemin, 600);
  return data?.signedUrl ?? null;
}
