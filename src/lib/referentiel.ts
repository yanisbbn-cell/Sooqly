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

/** Après une modification par l'administrateur : la donnée sera relue au prochain affichage. */
export const oublierReferentiel = (cle: 'reglages' | 'motsInterdits' | 'charte') => memoire.delete(cle);
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

// ---------- Catégories et réglages (étape 4) ----------

export type Critere = {
  cle: string;
  fr: string;
  ar: string;
  type: 'texte' | 'nombre' | 'choix';
  options?: { v: string; fr: string; ar: string }[];
  /** Demandé seulement pour une location (capacité d'un logement, type de véhicule). */
  location?: boolean;
};
export type SousCategorie = { id: number; nom_fr: string; nom_ar: string; ordre: number; reservee_meme_sexe: boolean };
export type Categorie = {
  cle: string;
  ordre: number;
  nom_fr: string;
  nom_ar: string;
  nom_court_fr: string | null;
  icone: string;
  criteres: Critere[];
  fourchettes_prix: Record<string, [number, number]>;
  titre_exemple: TexteBilingue;
  conseil_description: TexteBilingue;
  sous_categories: SousCategorie[];
};
export type Reglages = {
  taux_dinar_euro: number;
  seuil_badge: number;
  duree_vie_annonce_jours: number;
  rappel_expiration_jours: number;
  /** Mise en avant : nombre de jours → prix en DA (ex. { "7": 1500 }). Vide tant que l'administrateur ne l'a pas réglé. */
  tarifs_mise_en_avant: Record<string, number>;
};

async function chargerCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(
      'cle, ordre, nom_fr, nom_ar, nom_court_fr, icone, criteres, fourchettes_prix, titre_exemple, conseil_description, sous_categories:subcategories(id, nom_fr, nom_ar, ordre, reservee_meme_sexe)',
    )
    .order('ordre');
  if (error) throw error;
  return (data as Categorie[]).map((c) => ({ ...c, sous_categories: [...c.sous_categories].sort((a, b) => a.ordre - b.ordre) }));
}

async function chargerReglages(): Promise<Reglages> {
  const { data, error } = await supabase
    .from('settings')
    .select('taux_dinar_euro, seuil_badge, duree_vie_annonce_jours, rappel_expiration_jours, tarifs_mise_en_avant')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return { ...data, taux_dinar_euro: Number(data.taux_dinar_euro) } as Reglages;
}

export const useCategories = () => useDonnees('categories', chargerCategories);
export const useReglages = () => useDonnees('reglages', chargerReglages);

// ---------- Mots interdits (étape 5) ----------

export type FamilleInterdite = {
  cle: string;
  effet: 'interdit' | 'professionnel';
  motif_fr: string;
  motif_ar: string;
  termes: { langue: 'fr' | 'ar'; terme: string }[];
};

async function chargerMotsInterdits(): Promise<FamilleInterdite[]> {
  const { data, error } = await supabase.from('banned_families').select('cle, effet, motif_fr, motif_ar, termes:banned_terms(langue, terme)');
  if (error) throw error;
  return data as FamilleInterdite[];
}

export const useMotsInterdits = () => useDonnees('motsInterdits', chargerMotsInterdits);

/**
 * Détecteur de mots interdits (mêmes règles que la base, voir supabase/migrations/…_mots_interdits.sql) :
 * mot latin de 5 lettres ou plus = début d'un mot du texte ; plus court = mot identique ; mot arabe = présent n'importe où.
 * La famille « professionnel » ne concerne qu'un particulier.
 */
export function famillesDetectees(texte: string, estPro: boolean, familles: FamilleInterdite[]): FamilleInterdite[] {
  const t = normaliser(texte);
  const mots = t.split(/[^a-z0-9]+/).filter(Boolean);
  return familles.filter(
    (f) =>
      (f.effet === 'interdit' || !estPro) &&
      f.termes.some(({ langue, terme }) => {
        const n = normaliser(terme);
        if (langue === 'ar') return t.includes(n);
        return n.length >= 5 ? mots.some((m) => m.startsWith(n)) : mots.includes(n);
      }),
  );
}
