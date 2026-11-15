import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { ar } from './ar';
import { fr } from './fr';

export type Langue = 'fr' | 'ar';

export const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
