import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { useAuth } from './auth';
import { ecouterMessages } from './messagerie';
import { supabase } from './supabase';

/**
 * Notifications de la messagerie :
 *  - pastille du nombre de messages non lus sur l'onglet Messages (et sur l'icône de l'appli) ;
 *  - notification sur le téléphone à chaque nouveau message, envoyée par la base via le service gratuit d'Expo.
 * Limite d'Expo Go : les notifications marchent sur iPhone, pas sur Android (elles marcheront dans la vraie appli).
 */

// Une notification reçue pendant que l'appli est ouverte s'affiche quand même en bandeau.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
  });
}

type Contexte = { nonLus: number; rafraichir: () => void };
const Ctx = createContext<Contexte>({ nonLus: 0, rafraichir: () => {} });

async function obtenirJeton(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const actuel = await Notifications.getPermissionsAsync();
  const permission = actuel.granted ? actuel : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth();
  const [nonLus, setNonLus] = useState(0);
  const jeton = useRef<string | null>(null);
  const membre = useRef<string | null>(null);

  const rafraichir = useCallback(async () => {
    if (!profil) return setNonLus(0);
    const { data } = await supabase.rpc('nombre_non_lus');
    const n = typeof data === 'number' ? data : 0;
    setNonLus(n);
    if (Platform.OS !== 'web') Notifications.setBadgeCountAsync(n).catch(() => {});
  }, [profil]);

  // Connexion : enregistre le jeton du téléphone pour ce compte. Déconnexion : le retire.
  useEffect(() => {
    if (profil) {
      membre.current = profil.id;
      obtenirJeton()
        .then(async (j) => {
          if (!j) return;
          jeton.current = j;
          await supabase.rpc('enregistrer_jeton', { p_jeton: j, p_plateforme: Platform.OS });
        })
        .catch(() => {
          // Expo Go sur Android, simulateur ou refus : pas de notification, l'appli continue normalement.
        });
    } else if (membre.current) {
      membre.current = null;
      if (Platform.OS !== 'web') Notifications.setBadgeCountAsync(0).catch(() => {});
    }
  }, [profil]);

  // Pastille à jour : au démarrage, à chaque nouveau message, et au retour dans l'appli.
  useEffect(() => {
    rafraichir();
    if (!profil) return;
    const canal = ecouterMessages(`non-lus-${profil.id}`, null, () => rafraichir());
    const etat = AppState.addEventListener('change', (e) => e === 'active' && rafraichir());
    return () => {
      supabase.removeChannel(canal);
      etat.remove();
    };
  }, [profil, rafraichir]);

  // Toucher une notification ouvre la discussion.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const abonnement = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.conversation_id;
      if (typeof id === 'string') router.push({ pathname: '/discussion/[id]', params: { id } });
      else if (r.notification.request.content.data?.mes_annonces) router.push('/mes-annonces');
      else if (r.notification.request.content.data?.charte) router.push('/charte');
      else if (typeof r.notification.request.content.data?.annonce_id === 'string')
        router.push({ pathname: '/annonce/[id]', params: { id: r.notification.request.content.data.annonce_id as string } });
    });
    return () => abonnement.remove();
  }, []);

  const valeur = useMemo(() => ({ nonLus, rafraichir }), [nonLus, rafraichir]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export const useNonLus = () => useContext(Ctx);

/** À appeler avant la déconnexion : ce téléphone ne reçoit plus les notifications de ce compte. */
export async function retirerJetonDuTelephone() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId as string });
    await supabase.from('push_tokens').delete().eq('jeton', data);
  } catch {
    // rien à retirer
  }
}
