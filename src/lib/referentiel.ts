import { useCallback, useEffect, useState } from 'react';

import { supabase, supabaseConfigure } from './supabase';

/** Données de référence lues dans Supabase : wilayas et charte. */

export type Wilaya = { code: number; nom_fr: string; nom_ar: string };

export type TexteBilingue = { fr: string; ar: string };
export type Citation = { ar: string; fr: string; ref_fr: string; ref_ar: string };
export type ArticleCharte = {
  numero: number;
  titre_fr: string;
  titre_ar: string;
  paragraphes: TexteBilingue[];
  puces: TexteBilingue[];
  citations: Citation[];
};
export type Charte = {
  articles: ArticleCharte[];
  textes: Record<'preambule' | 'conclusion' | 'mise_a_jour', TexteBilingue>;
};

async function chargerWilayas(): Promise<Wilaya[]> {
  const { data, error } = await supabase.from('wilayas').select('code, nom_fr, nom_ar').order('code');
  if (error) throw error;
  return data;
}

async function chargerCharte(): Promise<Charte> {
  const [articles, textes] = await Promise.all([
    supabase.from('charter_articles').select('numero, titre_fr, titre_ar, paragraphes, puces, citations').order('numero'),
    supabase.from('charter_texts').select('cle, texte_fr, texte_ar'),
  ]);
  if (articles.error) throw articles.error;
  if (textes.error) throw textes.error;
  const t = Object.fromEntries(textes.data.map((x) => [x.cle, { fr: x.texte_fr, ar: x.texte_ar }]));
  return { articles: articles.data as ArticleCharte[], textes: t as Charte['textes'] };
}

// Mémoire partagée : chaque donnée n'est chargée qu'une fois par lancement de l'appli.
const memoire = new Map<string, unknown>();

type Etat<T> = { donnees: T | null; chargement: boolean; erreur: boolean; reessayer: () => void };

function useDonnees<T>(cle: string, charger: () => Promise<T>): Etat<T> {
  const [donnees, setDonnees] = useState<T | null>((memoire.get(cle) as T) ?? null);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (memoire.has(cle)) return;
    let actif = true;
    setErreur(false);
    (supabaseConfigure ? charger() : Promise.reject(new Error('Supabase non configuré')))
      .then((d) => {
        memoire.set(cle, d);
        if (actif) setDonnees(d);
      })
      .catch(() => actif && setErreur(true));
    return () => {
      actif = false;
    };
  }, [cle, charger, essai]);

  const reessayer = useCallback(() => setEssai((n) => n + 1), []);
  return { donnees, chargement: !donnees && !erreur, erreur, reessayer };
}

export const useWilayas = () => useDonnees('wilayas', chargerWilayas);
export const useCharte = () => useDonnees('charte', chargerCharte);

/** Numéro de wilaya sur deux chiffres : 1 → « 01 ». */
export const numeroWilaya = (code: number) => String(code).padStart(2, '0');

/**
 * Normalise un texte pour la recherche (comme la maquette) :
 * minuscules, sans accents, sans harakât, hamza ramenée à alif.
 */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[’']/g, '')
    .trim();
}
