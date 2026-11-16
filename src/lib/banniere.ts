import { decode } from 'base64-arraybuffer';

import { supabase } from './supabase';

/**
 * Bannière de la Page Pro (professionnels) : une photo d'une de leurs annonces (en ligne tout de suite),
 * ou une photo du téléphone (vérifiée par la modération avant de s'afficher).
 */

/** Adresse publique d'une bannière enregistrée sous la forme « seau/fichier ». */
export function urlBanniere(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  const i = chemin.indexOf('/');
  return supabase.storage.from(chemin.slice(0, i)).getPublicUrl(chemin.slice(i + 1)).data.publicUrl;
}

export async function maBanniere(): Promise<{ banniere: string | null; proposee: string | null; est_pro: boolean } | null> {
  const { data } = await supabase.rpc('ma_banniere');
  return (data as { banniere: string | null; proposee: string | null; est_pro: boolean } | null) ?? null;
}

/** Photos acceptées de mes annonces en ligne (choix A). */
export async function photosDeMesAnnonces(membreId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('listing_photos')
    .select('fichier, ordre, annonce:listings!inner(auteur_id, statut)')
    .eq('decision_moderation', 'acceptee')
    .eq('annonce.auteur_id', membreId)
    .in('annonce.statut', ['en_ligne', 'reserve'])
    .order('ordre');
  if (error) throw error;
  return (data as unknown as { fichier: string }[]).map((p) => p.fichier);
}

export async function choisirBanniereAnnonce(fichier: string) {
  const { data, error } = await supabase.rpc('choisir_banniere_annonce', { p_fichier: fichier });
  return !error && data === true;
}

/** Choix B : envoie la photo (déjà vérifiée par le détecteur sur l'appareil), puis la propose à la modération. */
export async function proposerBanniere(membreId: string, base64: string) {
  const chemin = `${membreId}/${Date.now().toString(36)}.jpg`;
  const envoi = await supabase.storage.from('bannieres').upload(chemin, decode(base64), { contentType: 'image/jpeg' });
  if (envoi.error) return false;
  const { data, error } = await supabase.rpc('proposer_banniere', { p_fichier: chemin });
  return !error && data === true;
}

export async function retirerBanniere() {
  const { error } = await supabase.rpc('retirer_banniere');
  return !error;
}

export type BanniereAVerifier = { membre_id: string; nom: string; fichier: string };

export async function bannieresAVerifier(): Promise<BanniereAVerifier[]> {
  const { data, error } = await supabase.rpc('bannieres_a_verifier');
  if (error) throw error;
  return (data ?? []) as BanniereAVerifier[];
}

export async function deciderBanniere(membreId: string, accepter: boolean) {
  const { data, error } = await supabase.rpc('decider_banniere', { p_membre: membreId, p_accepter: accepter });
  return !error && data === true;
}
