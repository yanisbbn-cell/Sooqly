import { RESUME, type AnnonceResume } from './annonces';
import { supabase } from './supabase';

/** Étape 10, morceau 2 : favoris et alerte de baisse de prix. */

export type Favori = {
  annonce_id: string;
  alerte_prix: boolean;
  /** Prix au moment de l'ajout : sert à afficher une baisse (ancien prix barré, pourcentage). */
  prix_ajout_da: number | null;
  cree_le: string;
  /** null si l'annonce n'est plus visible (vendue, expirée, supprimée par la modération…). */
  annonce: AnnonceResume | null;
};

export async function lireFavori(membreId: string, annonceId: string): Promise<{ alerte_prix: boolean } | null> {
  const { data } = await supabase
    .from('favorites')
    .select('alerte_prix')
    .eq('membre_id', membreId)
    .eq('annonce_id', annonceId)
    .maybeSingle();
  return data as { alerte_prix: boolean } | null;
}

export async function ajouterFavori(membreId: string, annonceId: string) {
  const { error } = await supabase.from('favorites').insert({ membre_id: membreId, annonce_id: annonceId });
  return !error || error.code === '23505';
}

export async function retirerFavori(membreId: string, annonceId: string) {
  const { error } = await supabase.from('favorites').delete().eq('membre_id', membreId).eq('annonce_id', annonceId);
  return !error;
}

export async function changerAlertePrix(membreId: string, annonceId: string, active: boolean) {
  const { error } = await supabase.from('favorites').update({ alerte_prix: active }).eq('membre_id', membreId).eq('annonce_id', annonceId);
  return !error;
}

export async function mesFavoris(membreId: string): Promise<Favori[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`annonce_id, alerte_prix, prix_ajout_da, cree_le, annonce:listings(${RESUME})`)
    .eq('membre_id', membreId)
    .order('cree_le', { ascending: false });
  if (error) throw error;
  return data as unknown as Favori[];
}

/** Baisse depuis l'ajout en favori, en pourcentage entier (null s'il n'y a pas de baisse). */
export function baisse(f: Favori): number | null {
  const actuel = f.annonce?.prix_da;
  if (!f.prix_ajout_da || actuel == null || f.annonce?.type === 'location' || actuel >= f.prix_ajout_da) return null;
  return Math.round(((f.prix_ajout_da - actuel) / f.prix_ajout_da) * 100);
}
