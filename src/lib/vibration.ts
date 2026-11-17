import { Platform } from 'react-native';

/**
 * Petite vibration de confirmation (favori, publication). Sans effet sur le site.
 * Le module est chargé à la demande : une ancienne version de l'application Android qui ne le contient pas
 * ne plante pas, elle ne vibre simplement pas (jusqu'à la prochaine version installée).
 */
export function vibrer(force: 'legere' | 'succes' = 'legere') {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const h = require('expo-haptics') as typeof import('expo-haptics');
    const p =
      force === 'succes'
        ? h.notificationAsync(h.NotificationFeedbackType.Success)
        : h.impactAsync(h.ImpactFeedbackStyle.Light);
    p.catch(() => undefined);
  } catch {
    // Module absent de cette version de l'application : pas de vibration.
  }
}
