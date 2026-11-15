import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { MODELE, SCRIPTS, interpreter, type Analyse, type Objet } from './commun';

type Modele = { detect: (img: HTMLImageElement, max: number, seuil: number) => Promise<{ class: string; score: number }[]> };
type Detecteur = { pret: boolean; indisponible: boolean; analyser: (base64: string) => Promise<Analyse> };
const Contexte = createContext<Detecteur | null>(null);

function chargerScript(src: string) {
  return new Promise<void>((ok, ko) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => ko(new Error(src));
    document.head.appendChild(s);
  });
}

/** Version site web : le modèle tourne directement dans la page du navigateur. */
export function DetecteurProvider({ children }: { children: ReactNode }) {
  const modele = useRef<Modele | null>(null);
  const [pret, setPret] = useState(false);
  const [indisponible, setIndisponible] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        for (const s of SCRIPTS) await chargerScript(s);
        const coco = (window as unknown as { cocoSsd: { load: (o: object) => Promise<Modele> } }).cocoSsd;
        modele.current = await coco.load(MODELE);
        if (actif) setPret(true);
      } catch {
        if (actif) setIndisponible(true);
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  const analyser = useCallback(async (base64: string): Promise<Analyse> => {
    if (!modele.current) return { interdit: false, objets: [], erreur: true };
    try {
      const img = new Image();
      await new Promise((ok, ko) => {
        img.onload = ok;
        img.onerror = ko;
        img.src = `data:image/jpeg;base64,${base64}`;
      });
      const p = await modele.current.detect(img, 10, 0.2);
      return interpreter(p.map((x): Objet => ({ classe: x.class, score: x.score })));
    } catch {
      return { interdit: false, objets: [], erreur: true };
    }
  }, []);

  const valeur = useMemo(() => ({ pret, indisponible, analyser }), [pret, indisponible, analyser]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useDetecteur(): Detecteur {
  const d = useContext(Contexte);
  if (!d) throw new Error('useDetecteur doit être utilisé dans DetecteurProvider');
  return d;
}
