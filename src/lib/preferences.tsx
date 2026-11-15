import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';

import i18n, { type Langue } from '@/i18n';

import { cles, ecrire, lire } from './stockage';

type Preferences = {
  pret: boolean;
  langue: Langue;
  rtl: boolean;
  changerLangue: () => void;
  accueilVisible: boolean;
  fermerAccueil: () => void;
  revoirAccueil: () => void;
};

const Contexte = createContext<Preferences | null>(null);

// Le sens droite-à-gauche est géré par Sooqly lui-même (style « direction »),
// pour basculer instantanément sans redémarrer l'appli.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

function appliquerSurLeWeb(langue: Langue) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = langue;
    document.documentElement.dir = langue === 'ar' ? 'rtl' : 'ltr';
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [langue, setLangue] = useState<Langue>('fr');
  const [accueilVisible, setAccueilVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [langueGardee, accueilVu] = await Promise.all([lire(cles.langue), lire(cles.accueilVu)]);
      const l: Langue = langueGardee === 'ar' ? 'ar' : 'fr';
      await i18n.changeLanguage(l);
      appliquerSurLeWeb(l);
      setLangue(l);
      setAccueilVisible(accueilVu !== '1');
      setPret(true);
    })();
  }, []);

  const changerLangue = useCallback(() => {
    const l: Langue = langue === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(l);
    appliquerSurLeWeb(l);
    setLangue(l);
    ecrire(cles.langue, l);
  }, [langue]);

  const fermerAccueil = useCallback(() => {
    setAccueilVisible(false);
    ecrire(cles.accueilVu, '1');
  }, []);

  const revoirAccueil = useCallback(() => setAccueilVisible(true), []);

  const valeur = useMemo(
    () => ({ pret, langue, rtl: langue === 'ar', changerLangue, accueilVisible, fermerAccueil, revoirAccueil }),
    [pret, langue, changerLangue, accueilVisible, fermerAccueil, revoirAccueil],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function usePreferences(): Preferences {
  const p = useContext(Contexte);
  if (!p) throw new Error('usePreferences doit être utilisé dans PreferencesProvider');
  return p;
}
