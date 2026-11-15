import 'i18next';

import type { fr } from './fr';

// Les clés de traduction sont vérifiées par TypeScript : une clé inexistante est une erreur.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
  }
}
