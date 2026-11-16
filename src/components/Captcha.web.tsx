import { createElement, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { CLE_CAPTCHA } from '@/lib/site';

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let chargement: Promise<void> | null = null;
function chargerScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        chargement = null;
        reject(new Error('Turnstile indisponible'));
      };
      document.head.appendChild(s);
    });
  }
  return chargement;
}

/** Vérification « humain » Cloudflare Turnstile, version site web. Pour la relancer, changer la prop `key`. */
export function Captcha({ onJeton }: { onJeton: (jeton: string | null) => void }) {
  const { langue } = usePreferences();
  const conteneur = useRef<HTMLDivElement | null>(null);
  const rappel = useRef(onJeton);
  rappel.current = onJeton;

  useEffect(() => {
    let id: string | null = null;
    let actif = true;
    chargerScript()
      .then(() => {
        if (!actif || !conteneur.current || !window.turnstile) return;
        id = window.turnstile.render(conteneur.current, {
          sitekey: CLE_CAPTCHA,
          language: langue,
          theme: 'light',
          callback: (t: string) => rappel.current(t),
          'expired-callback': () => rappel.current(null),
          'error-callback': () => rappel.current(null),
        });
      })
      .catch(() => rappel.current(null));
    return () => {
      actif = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [langue]);

  return <View style={{ minHeight: 70, alignItems: 'center' }}>{createElement('div', { ref: conteneur })}</View>;
}
