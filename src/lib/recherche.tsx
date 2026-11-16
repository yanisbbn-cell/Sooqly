import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { estSponsorisee, type AnnonceResume, type Etat } from './annonces';
import { normaliser, type Critere } from './referentiel';
import { supabase } from './supabase';

/**
 * Recherche, filtres et tri des annonces, partagés entre l'accueil et l'écran Filtres.
 * Le filtrage se fait dans la base ; seul « Près de chez moi » est un classement fait dans l'appli.
 */

export type Tri = 'recent' | 'prix_croissant' | 'prix_decroissant' | 'proche';
export type Annonceur = 'tous' | 'particuliers' | 'professionnels';
export type TypeFiltre = 'tous' | 'vente' | 'service' | 'don';
/** Valeur d'un critère : liste de choix, fourchette de nombres, ou texte. */
export type ValeurCritere = string[] | { min: number | null; max: number | null } | string;

export type Filtres = {
  texte: string;
  categorie: string | null;
  sousCategories: number[];
  criteres: Record<string, ValeurCritere>;
  wilaya: number | null;
  prixMin: number | null;
  prixMax: number | null;
  type: TypeFiltre;
  annonceur: Annonceur;
  etats: Etat[];
};

export const FILTRES_VIDES: Filtres = {
  texte: '',
  categorie: null,
  sousCategories: [],
  criteres: {},
  wilaya: null,
  prixMin: null,
  prixMax: null,
  type: 'tous',
  annonceur: 'tous',
  etats: [],
};

const critereActif = (v: ValeurCritere | undefined) =>
  !!v && (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v.min !== null || v.max !== null);

/** Nombre de filtres actifs (hors texte et catégorie), pour la pastille du bouton Filtres. */
export function nombreFiltres(f: Filtres): number {
  return (
    Object.values(f.criteres).filter(critereActif).length +
    (f.wilaya ? 1 : 0) +
    (f.prixMin !== null || f.prixMax !== null ? 1 : 0) +
    (f.type !== 'tous' ? 1 : 0) +
    (f.annonceur !== 'tous' ? 1 : 0) +
    (f.etats.length ? 1 : 0)
  );
}

const RESUME =
  'id, type, categorie, sous_categorie_id, titre, prix_da, etat, ville, wilaya_code, statut, publie_le, sponsorise_jusqu, photos:listing_photos(fichier, ordre, angle, decision_moderation, resultat_detecteur), tarifs:listing_rates(unite, prix_da)';

/** Mots de la recherche, normalisés ; on ne garde que lettres et chiffres (pas de caractères spéciaux). */
export function mots(texte: string): string[] {
  return normaliser(texte)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((m) => m.length > 0)
    .slice(0, 6);
}

function requete(f: Filtres, criteres: Critere[], options: { compter?: boolean } = {}) {
  // « !inner » : nécessaire pour filtrer sur le statut pro de l'auteur.
  const auteur = f.annonceur === 'tous' ? 'auteur:profiles!listings_auteur_id_fkey(id, est_pro)' : 'auteur:profiles!listings_auteur_id_fkey!inner(id, est_pro)';
  let q = supabase
    .from('listings')
    .select(`${RESUME}, ${auteur}`, options.compter ? { count: 'exact', head: true } : undefined)
    .in('statut', ['en_ligne', 'reserve']);

  for (const m of mots(f.texte)) q = q.ilike('texte_recherche', `%${m}%`);
  if (f.categorie) q = q.eq('categorie', f.categorie);
  if (f.sousCategories.length) q = q.in('sous_categorie_id', f.sousCategories);
  if (f.wilaya) q = q.eq('wilaya_code', f.wilaya);
  if (f.prixMin !== null) q = q.gte('prix_da', f.prixMin);
  if (f.prixMax !== null) q = q.lte('prix_da', f.prixMax);
  if (f.type !== 'tous') q = q.eq('type', f.type);
  if (f.etats.length) q = q.in('etat', f.etats);
  if (f.annonceur !== 'tous') q = q.eq('auteur.est_pro', f.annonceur === 'professionnels');

  // Critères propres à la catégorie (seulement ceux de la catégorie choisie).
  for (const c of f.categorie ? criteres : []) {
    const v = f.criteres[c.cle];
    if (!critereActif(v)) continue;
    if (Array.isArray(v)) q = q.in(`caracteristiques->>${c.cle}`, v);
    else if (typeof v === 'string') {
      // Texte libre (marque, couleur…) : cherché dans le texte normalisé de l'annonce, sans tenir compte des accents.
      const m = mots(v)[0];
      if (m) q = q.ilike('texte_recherche', `%${m}%`);
    } else {
      if (v.min !== null) q = q.gte(`caracteristiques->${c.cle}`, v.min);
      if (v.max !== null) q = q.lte(`caracteristiques->${c.cle}`, v.max);
    }
  }
  return q;
}

export async function compterAnnonces(f: Filtres, criteres: Critere[]): Promise<number> {
  const { count, error } = await requete(f, criteres, { compter: true });
  if (error) throw error;
  return count ?? 0;
}

/**
 * Les annonces sponsorisées passent toujours devant, puis le tri choisi.
 * « Près de chez moi » : d'abord la wilaya du membre, puis les plus récentes.
 */
export async function chercherAnnonces(f: Filtres, criteres: Critere[], tri: Tri, maWilaya: number | null): Promise<AnnonceResume[]> {
  let q = requete(f, criteres);
  q =
    tri === 'prix_croissant'
      ? q.order('prix_da', { ascending: true })
      : tri === 'prix_decroissant'
        ? q.order('prix_da', { ascending: false })
        : q.order('publie_le', { ascending: false });
  const { data, error } = await q.limit(200);
  if (error) throw error;
  let liste = data as unknown as AnnonceResume[];
  if (tri === 'proche' && maWilaya) {
    liste = [...liste.filter((a) => a.wilaya_code === maWilaya), ...liste.filter((a) => a.wilaya_code !== maWilaya)];
  }
  return [...liste.filter(estSponsorisee), ...liste.filter((a) => !estSponsorisee(a))];
}

type Recherche = {
  filtres: Filtres;
  setFiltres: (f: Filtres) => void;
  tri: Tri;
  setTri: (t: Tri) => void;
};

const Contexte = createContext<Recherche | null>(null);

export function RechercheProvider({ children }: { children: ReactNode }) {
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [tri, setTri] = useState<Tri>('recent');
  const valeur = useMemo(() => ({ filtres, setFiltres, tri, setTri }), [filtres, tri]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useRecherche(): Recherche {
  const r = useContext(Contexte);
  if (!r) throw new Error('useRecherche doit être utilisé dans RechercheProvider');
  return r;
}
