import { createContext, useContext } from 'react';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * Marges réelles de l'écran (encoche, barre d'état). Sous la barre du logo, les écrans reçoivent une marge haute
 * de 0 (la barre la prend déjà) ; une fenêtre plein écran (visionneuse de photos) a besoin des vraies marges.
 */
export const InsetsEcran = createContext<EdgeInsets | null>(null);

export function useInsetsEcran(): EdgeInsets {
  const locales = useSafeAreaInsets();
  return useContext(InsetsEcran) ?? locales;
}
