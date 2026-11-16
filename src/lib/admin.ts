import { normaliser, oublierReferentiel, type Reglages } from './referentiel';
import { supabase } from './supabase';

/** Étape 12 : réglages réservés à l'administrateur, mise en avant, rôles, charte. */

export async function enregistrerReglages(r: Omit<Reglages, 'tarifs_mise_en_avant'>) {
  const { error } = await supabase.from('settings').update({ ...r, modifie_le: new Date().toISOString() }).eq('id', 1);
  oublierReferentiel('reglages');
  return !error;
}

export async function enregistrerTarifs(tarifs: Record<string, number>) {
  const { error } = await supabase.from('settings').update({ tarifs_mise_en_avant: tarifs }).eq('id', 1);
  oublierReferentiel('reglages');
  return !error;
}

export async function ajouterMotInterdit(famille: string, langue: 'fr' | 'ar', mot: string) {
  const terme = normaliser(mot);
  if (!terme) return false;
  const { error } = await supabase.from('banned_terms').insert({ famille, langue, terme });
  oublierReferentiel('motsInterdits');
  return !error || error.code === '23505';
}

export async function retirerMotInterdit(famille: string, langue: 'fr' | 'ar', terme: string) {
  const { error } = await supabase.from('banned_terms').delete().eq('famille', famille).eq('langue', langue).eq('terme', terme);
  oublierReferentiel('motsInterdits');
  return !error;
}

export type Bilingue = { fr: string; ar: string };

export async function publierArticle(numero: number, titreFr: string, titreAr: string, paragraphes: Bilingue[], puces: Bilingue[]) {
  const { data, error } = await supabase.rpc('publier_article_charte', {
    p_numero: numero,
    p_titre_fr: titreFr.trim(),
    p_titre_ar: titreAr.trim(),
    p_paragraphes: paragraphes.map((p) => ({ fr: p.fr.trim(), ar: p.ar.trim() })).filter((p) => p.fr || p.ar),
    p_puces: puces.map((p) => ({ fr: p.fr.trim(), ar: p.ar.trim() })).filter((p) => p.fr || p.ar),
  });
  oublierReferentiel('charte');
  return !error && data === true;
}

/** Sponsoriser une annonce de pro pendant N jours, ou arrêter (jours = null). */
export async function sponsoriser(annonceId: string, jours: number | null) {
  const jusqu = jours ? new Date(Date.now() + jours * 24 * 3600 * 1000).toISOString() : null;
  const { data, error } = await supabase.rpc('sponsoriser', { p_annonce: annonceId, p_jusqu: jusqu });
  return !error && data === true;
}

export async function changerRole(membreId: string, role: 'membre' | 'moderateur') {
  const { data, error } = await supabase.rpc('changer_role', { p_membre: membreId, p_role: role });
  return !error && data === true;
}

export type MembreEquipe = { id: string; nom_affiche: string; avatar: number | null; role: 'moderateur' | 'admin' };

export async function equipeModeration(): Promise<MembreEquipe[]> {
  const { data, error } = await supabase.rpc('equipe_moderation');
  if (error) throw error;
  return (data ?? []) as MembreEquipe[];
}

/** Durées proposées pour la mise en avant (jours). */
export const DUREES_MISE_EN_AVANT = [7, 15, 30] as const;
