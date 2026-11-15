import { supabase } from './supabase';

/**
 * Location (logements et véhicules) : unités de tarif, calcul des totaux, recherche façon Booking.
 * Les règles sont les mêmes que dans la base (fonction « chercher_locations ») :
 *   - nuits = jours d'écart ; jours (véhicules) = écart + 1 ;
 *   - semaines = jours / 7 et mois = jours / 30, arrondis au-dessus ;
 *   - 1 mois, 6 mois, 1 an : le tarif de la durée, sinon le tarif mensuel × nombre de mois.
 */

export type Unite = 'nuit' | 'jour' | 'semaine' | 'mois' | '6_mois' | 'an';
export type Genre = 'logement' | 'vehicule';
export type Duree = 'dates' | '1_mois' | '6_mois' | '1_an';
export type Tarif = { unite: Unite; prix_da: number };
export type Periode = { debut: string; fin: string };

export const UNITES: Record<'immobilier' | 'vehicules', Unite[]> = {
  immobilier: ['nuit', 'semaine', 'mois', '6_mois', 'an'],
  vehicules: ['jour', 'semaine', 'mois', '6_mois', 'an'],
};
const ORDRE_COURT: Unite[] = ['nuit', 'jour', 'semaine', 'mois'];

export const genrePourCategorie = (categorie: string): Genre | null =>
  categorie === 'immobilier' ? 'logement' : categorie === 'vehicules' ? 'vehicule' : null;

/** La clé des fourchettes de prix en base utilise « 6 mois » avec une espace. */
export const cleFourchette = (u: Unite) => u.replace('_', ' ');

// ---------- Dates « AAAA-MM-JJ » (sans heure ni fuseau) ----------

export const versTexte = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const depuisTexte = (s: string) => {
  const [a, m, j] = s.split('-').map(Number);
  return new Date(a!, m! - 1, j!);
};
export const aujourdhui = () => versTexte(new Date());
/** Nombre de jours d'écart entre deux dates. */
export const ecart = (debut: string, fin: string) =>
  Math.round((depuisTexte(fin).getTime() - depuisTexte(debut).getTime()) / 86_400_000);
export const ajouterMois = (debut: string, mois: number) => {
  const d = depuisTexte(debut);
  const f = new Date(d.getFullYear(), d.getMonth() + mois, d.getDate() - 1);
  return versTexte(f);
};
export const moisDeDuree = (d: Duree) => (d === '1_mois' ? 1 : d === '6_mois' ? 6 : d === '1_an' ? 12 : 0);

// ---------- Totaux ----------

/** Plus petit tarif « court » d'un bien : celui utilisé pour des dates précises. */
export const tarifCourt = (tarifs: Tarif[]) =>
  [...tarifs].filter((t) => ORDRE_COURT.includes(t.unite)).sort((a, b) => ORDRE_COURT.indexOf(a.unite) - ORDRE_COURT.indexOf(b.unite))[0] ?? null;

export function nombreUnites(unite: Unite, debut: string, fin: string): number {
  const nuits = ecart(debut, fin);
  const jours = nuits + 1;
  if (unite === 'nuit') return nuits;
  if (unite === 'jour') return jours;
  if (unite === 'semaine') return Math.ceil(jours / 7);
  return Math.ceil(jours / 30);
}

/** Total pour des dates précises (fiche d'une annonce), ou null sans tarif court. */
export function totalDates(tarifs: Tarif[], debut: string, fin: string): { total: number; unite: Unite; nombre: number } | null {
  const t = tarifCourt(tarifs);
  if (!t) return null;
  const nombre = nombreUnites(t.unite, debut, fin);
  if (nombre <= 0) return null;
  return { total: nombre * t.prix_da, unite: t.unite, nombre };
}

/** Le bien est-il libre sur toute la période ? */
export const estLibre = (periodes: Periode[], debut: string, fin: string) =>
  periodes.some((p) => p.debut <= debut && p.fin >= fin);

// ---------- Recherche ----------

export type CriteresLocation = {
  genre: Genre;
  duree: Duree;
  debut: string;
  fin: string | null;
  wilaya: number | null;
  types: string[];
  minPersonnes: number | null;
  boite: string | null;
  minPlaces: number | null;
  budget: number | null;
};

export type ResultatLocation = { annonce_id: string; total: number; unite: Unite; nombre: number; fin: string };

export async function chercherLocations(c: CriteresLocation): Promise<ResultatLocation[]> {
  const { data, error } = await supabase.rpc('chercher_locations', {
    p_genre: c.genre,
    p_debut: c.debut,
    p_fin: c.duree === 'dates' ? c.fin : null,
    p_duree: c.duree,
    p_wilaya: c.wilaya,
    p_types: c.types.length ? c.types : null,
    p_min_personnes: c.minPersonnes,
    p_boite: c.boite,
    p_min_places: c.minPlaces,
    p_budget: c.budget,
  });
  if (error) throw error;
  return (data as ResultatLocation[]).map((r) => ({ ...r, total: Number(r.total) }));
}

export async function lireTarifsEtDisponibilites(annonceId: string): Promise<{ tarifs: Tarif[]; periodes: Periode[] }> {
  const [t, d] = await Promise.all([
    supabase.from('listing_rates').select('unite, prix_da').eq('annonce_id', annonceId),
    supabase.from('availability').select('debut, fin').eq('annonce_id', annonceId).order('debut'),
  ]);
  if (t.error) throw t.error;
  if (d.error) throw d.error;
  return { tarifs: t.data as Tarif[], periodes: d.data as Periode[] };
}

/** Enregistre les tarifs et la période de disponibilité d'une location qui vient d'être créée. */
export async function enregistrerLocation(annonceId: string, tarifs: Tarif[], periode: Periode): Promise<boolean> {
  const r = await supabase.from('listing_rates').insert(tarifs.map((t) => ({ annonce_id: annonceId, ...t })));
  if (r.error) return false;
  const d = await supabase.from('availability').insert({ annonce_id: annonceId, ...periode });
  return !d.error;
}
