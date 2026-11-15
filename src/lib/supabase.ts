import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Connexion à la base Supabase.
 * L'adresse et la clé PUBLIQUE viennent des variables d'environnement (jamais écrites dans le code) :
 * - sur la machine de développement : fichier .env.local (ignoré par Git) ;
 * - pour Expo Go / EAS : variables du projet sur expo.dev.
 * Cette clé publique ne donne accès qu'à ce que les règles d'accès (RLS) autorisent.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cle = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabaseConfigure = Boolean(url && cle);

export const supabase = createClient(url ?? 'https://configuration-manquante.invalid', cle ?? 'cle-manquante', {
  auth: {
    // Sur le web pendant le rendu côté serveur, il n'y a pas de stockage.
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renouvelle la session seulement quand l'appli est au premier plan (recommandation Supabase).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (etat) => {
    if (etat === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
