import AsyncStorage from '@react-native-async-storage/async-storage';

/** Petites préférences gardées sur l'appareil (langue, accueil déjà vu). */
export const cles = {
  langue: 'sooqly.langue',
  accueilVu: 'sooqly.accueilVu',
  /** Code de parrainage reçu par un lien d'invitation, en attendant l'inscription. */
  parrain: 'sooqly.parrain',
} as const;

export async function lire(cle: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(cle);
  } catch {
    return null;
  }
}

export async function ecrire(cle: string, valeur: string): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, valeur);
  } catch {
    // Si l'appareil refuse, l'appli continue de fonctionner sans mémoriser.
  }
}
