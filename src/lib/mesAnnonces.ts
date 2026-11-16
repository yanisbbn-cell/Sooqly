import { RESUME, type AnnonceResume } from './annonces';
import { supabase } from './supabase';

/** Étape 10 : « Mes annonces » (statistiques, statuts, republication, suppression). */

export type MonAnnonce = AnnonceResume & { motif_refus: string | null; expire_le: string | null };

export type StatsAnnonce = {
  annonce_id: string;
  vues: number;
  /** Vues des 7 derniers jours, du plus ancien à aujourd'hui. */
  vues_7: number[];
  favoris: number;
  messages: number;
  acheteur_id: string | null;
  acheteur_nom: string | null;
  hors_sooqly: boolean;
  note_donnee: boolean;
};

export async function listerMesAnnonces(auteurId: string): Promise<{ annonces: MonAnnonce[]; stats: Map<string, StatsAnnonce> }> {
  const [l, s] = await Promise.all([
    supabase
      .from('listings')
      .select(`${RESUME}, motif_refus, expire_le, cree_le`)
      .eq('auteur_id', auteurId)
      .order('cree_le', { ascending: false }),
    supabase.rpc('stats_mes_annonces'),
  ]);
  if (l.error) throw l.error;
  if (s.error) throw s.error;
  return {
    annonces: l.data as unknown as MonAnnonce[],
    stats: new Map(((s.data ?? []) as StatsAnnonce[]).map((x) => [x.annonce_id, x])),
  };
}

/** Réservé ↔ Remettre en vente. */
export async function changerStatut(id: string, statut: 'en_ligne' | 'reserve') {
  const { error } = await supabase.from('listings').update({ statut }).eq('id', id);
  return !error;
}

/** Republication gratuite d'une annonce expirée (60 jours), avec le prix vérifié. */
export async function republier(id: string, prixDa: number | null) {
  const { error } = await supabase
    .from('listings')
    .update(prixDa === null ? { statut: 'en_ligne' } : { statut: 'en_ligne', prix_da: prixDa })
    .eq('id', id);
  return !error;
}

/** Supprime l'annonce et ses photos (fichiers compris). */
export async function supprimerAnnonce(id: string) {
  const { data } = await supabase.from('listing_photos').select('fichier').eq('annonce_id', id);
  const fichiers = (data ?? []).map((p: { fichier: string }) => p.fichier);
  if (fichiers.length) await supabase.storage.from('photos-annonces').remove(fichiers);
  const { error } = await supabase.from('listings').delete().eq('id', id);
  return !error;
}

export type AcheteurPossible = { id: string; nom: string; avatar: number | null };

/** Membres qui ont écrit au sujet de cette annonce (pour « Vendu » / « Loué »). */
export async function acheteursPossibles(annonceId: string): Promise<AcheteurPossible[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('acheteur:profiles!conversations_acheteur_id_fkey(id, nom_affiche, avatar)')
    .eq('annonce_id', annonceId)
    .order('dernier_message_le', { ascending: false });
  if (error) throw error;
  return (data as unknown as { acheteur: { id: string; nom_affiche: string; avatar: number | null } | null }[])
    .filter((x) => x.acheteur)
    .map((x) => ({ id: x.acheteur!.id, nom: x.acheteur!.nom_affiche, avatar: x.acheteur!.avatar }));
}

/** Une vue de la fiche (le serveur ignore les vues de l'auteur). */
export function compterVue(annonceId: string) {
  supabase.rpc('compter_vue', { p_annonce: annonceId }).then(
    () => undefined,
    () => undefined,
  );
}

/** Jours restants avant l'expiration (0 = aujourd'hui). */
export const joursRestants = (expire: string | null) =>
  expire ? Math.max(0, Math.ceil((new Date(expire).getTime() - Date.now()) / (24 * 3600 * 1000))) : null;
