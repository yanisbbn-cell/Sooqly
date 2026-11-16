import type { TFunction } from 'i18next';

import { formaterNombre } from './prix';
import { FILTRES_VIDES, mots, type Filtres } from './recherche';
import type { Categorie, Wilaya } from './referentiel';
import { supabase } from './supabase';

/**
 * Étape 10, morceau 3 : alertes de recherche.
 * On enregistre les filtres de la recherche, plus les mots normalisés comme le fait la recherche :
 * la base compare chaque nouvelle annonce validée avec les mêmes règles (prive.annonce_correspond).
 */

export type Alerte = {
  id: string;
  filtres: Filtres;
  notifications: boolean;
  nouvelles_annonces: number;
  cree_le: string;
};

/** Forme comparable d'une recherche (pour savoir si une alerte existe déjà pour elle). */
export function cleRecherche(f: Filtres): string {
  const criteres = Object.fromEntries(
    Object.entries(f.categorie ? f.criteres : {})
      .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v.min !== null || v.max !== null))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify({
    texte: f.texte.trim().toLowerCase(),
    categorie: f.categorie,
    sousCategories: [...f.sousCategories].sort((a, b) => a - b),
    criteres,
    wilaya: f.wilaya,
    prixMin: f.prixMin,
    prixMax: f.prixMax,
    type: f.type,
    annonceur: f.annonceur,
    etats: [...f.etats].sort(),
    livrable: f.livrable ? f.wilayaLivraison ?? true : false,
    validesSeulement: f.validesSeulement,
  });
}

/** Une recherche mérite une alerte dès qu'il y a un mot, une catégorie ou un filtre. */
export const rechercheAlertable = (f: Filtres) => cleRecherche(f) !== cleRecherche(FILTRES_VIDES);

export async function mesAlertes(): Promise<Alerte[]> {
  const { data, error } = await supabase
    .from('search_alerts')
    .select('id, filtres, notifications, nouvelles_annonces, cree_le')
    .order('cree_le', { ascending: false });
  if (error) throw error;
  return (data as Alerte[]).map((a) => ({ ...a, filtres: { ...FILTRES_VIDES, ...a.filtres } }));
}

export async function creerAlerte(membreId: string, f: Filtres): Promise<'ok' | 'limite' | 'erreur'> {
  const motsCriteres = Object.fromEntries(
    Object.entries(f.criteres)
      .filter(([, v]) => typeof v === 'string' && v.trim())
      .map(([k, v]) => [k, mots(v as string)[0] ?? '']),
  );
  const { error } = await supabase.from('search_alerts').insert({
    membre_id: membreId,
    filtres: { ...f, criteres: f.categorie ? f.criteres : {}, mots: mots(f.texte), mots_criteres: motsCriteres },
  });
  if (!error) return 'ok';
  return /20 alertes/.test(error.message) ? 'limite' : 'erreur';
}

export async function changerNotifications(id: string, actives: boolean) {
  const { error } = await supabase.from('search_alerts').update({ notifications: actives }).eq('id', id);
  return !error;
}

/** « Voir les annonces » : les nouvelles annonces ont été vues. */
export async function remettreAZero(id: string) {
  await supabase.from('search_alerts').update({ nouvelles_annonces: 0 }).eq('id', id);
}

export async function supprimerAlerte(id: string) {
  const { error } = await supabase.from('search_alerts').delete().eq('id', id);
  return !error;
}

/** Résumé lisible d'une alerte : titre (mots, catégorie) et détail (wilaya, critères, prix…). */
export function decrireAlerte(
  f: Filtres,
  t: TFunction,
  langue: 'fr' | 'ar',
  categories: Categorie[] | null,
  wilayas: Wilaya[] | null,
): { titre: string; detail: string } {
  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const virgule = langue === 'ar' ? '، ' : ', ';
  const parties: string[] = [];
  if (f.texte.trim()) parties.push(`« ${f.texte.trim()} »`);
  const c = categories?.find((x) => x.cle === f.categorie);
  if (c) {
    const sous = c.sous_categories.filter((s) => f.sousCategories.includes(s.id)).map(nom);
    parties.push(sous.length ? `${nom(c)} › ${sous.join(virgule)}` : nom(c));
  }

  const detail: string[] = [];
  const w = wilayas?.find((x) => x.code === f.wilaya);
  detail.push(w ? nom(w) : t('alertes.toutesWilayas'));
  for (const cr of c?.criteres ?? []) {
    const v = f.criteres[cr.cle];
    if (!v) continue;
    const libelle = langue === 'ar' ? cr.ar : cr.fr;
    if (Array.isArray(v)) {
      if (v.length) detail.push(v.map((o) => cr.options?.find((x) => x.v === o)?.[langue] ?? o).join(virgule));
    } else if (typeof v === 'string') {
      if (v.trim()) detail.push(`${libelle} : ${v.trim()}`);
    } else if (v.min !== null || v.max !== null) {
      detail.push(`${libelle} ${v.min !== null ? formaterNombre(v.min) : '…'}–${v.max !== null ? formaterNombre(v.max) : '…'}`);
    }
  }
  if (f.prixMin !== null && f.prixMax !== null)
    detail.push(t('alertes.entre', { min: formaterNombre(f.prixMin), max: formaterNombre(f.prixMax) }));
  else if (f.prixMax !== null) detail.push(t('alertes.moinsDe', { max: formaterNombre(f.prixMax) }));
  else if (f.prixMin !== null) detail.push(t('alertes.plusDe', { min: formaterNombre(f.prixMin) }));
  if (f.type !== 'tous') detail.push(t(`publier.types.${f.type}`));
  if (f.annonceur !== 'tous') detail.push(t(`filtres.${f.annonceur}`));
  if (f.livrable) detail.push(t('options.livrable'));
  if (f.validesSeulement) detail.push(t('options.valides'));
  if (f.etats.length) detail.push(f.etats.map((e) => (t(`etats.${e}`, { returnObjects: true }) as unknown as string[])[0]).join(virgule));

  return { titre: parties.join(' · ') || t('alertes.toutes'), detail: detail.join(' · ') };
}
