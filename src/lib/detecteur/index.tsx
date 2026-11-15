import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { interpreter, type Analyse, type Objet } from './commun';
import { PAGE_DETECTEUR } from './page';

// Les types de react-native-webview ne s'accordent pas encore avec React 19 : on précise ceux qu'on utilise.
const VueWeb = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

type Detecteur = { pret: boolean; indisponible: boolean; analyser: (base64: string) => Promise<Analyse> };
const Contexte = createContext<Detecteur | null>(null);

/** Version iPhone / Android : le modèle tourne dans une vue web invisible. */
export function DetecteurProvider({ children }: { children: ReactNode }) {
  const vue = useRef<WebView>(null);
  const attentes = useRef(new Map<string, (a: Analyse) => void>());
  const [pret, setPret] = useState(false);
  const [indisponible, setIndisponible] = useState(false);

  const recevoir = useCallback((e: WebViewMessageEvent) => {
    let m: { pret?: boolean; echecChargement?: string; id?: string; objets?: Objet[]; erreur?: string };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.pret) setPret(true);
    if (m.echecChargement) setIndisponible(true);
    if (m.id && attentes.current.has(m.id)) {
      const fin = attentes.current.get(m.id)!;
      attentes.current.delete(m.id);
      fin(m.objets ? interpreter(m.objets) : { interdit: false, objets: [], erreur: true });
    }
  }, []);

  const analyser = useCallback((base64: string) => {
    return new Promise<Analyse>((resoudre) => {
      const id = Math.random().toString(36).slice(2);
      attentes.current.set(id, resoudre);
      vue.current?.injectJavaScript(`window.analyser && window.analyser(${JSON.stringify(id)}, ${JSON.stringify(base64)}); true;`);
      // Sans réponse en 30 secondes : on laisse la modération humaine trancher.
      setTimeout(() => {
        if (attentes.current.has(id)) {
          attentes.current.delete(id);
          resoudre({ interdit: false, objets: [], erreur: true });
        }
      }, 30000);
    });
  }, []);

  const valeur = useMemo(() => ({ pret, indisponible, analyser }), [pret, indisponible, analyser]);
  return (
    <Contexte.Provider value={valeur}>
      {children}
      <View style={styles.cache} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <VueWeb
          ref={vue}
          source={{ html: PAGE_DETECTEUR, baseUrl: 'https://sooqly.invalid/' }}
          onMessage={recevoir}
          onError={() => setIndisponible(true)}
          javaScriptEnabled
          originWhitelist={['*']}
        />
      </View>
    </Contexte.Provider>
  );
}

export function useDetecteur(): Detecteur {
  const d = useContext(Contexte);
  if (!d) throw new Error('useDetecteur doit être utilisé dans DetecteurProvider');
  return d;
}

const styles = StyleSheet.create({
  // La vue web doit exister à l'écran pour fonctionner, mais elle reste invisible.
  cache: { position: 'absolute', width: 2, height: 2, opacity: 0, left: -10, top: -10 },
});
