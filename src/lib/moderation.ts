import { supabase } from './supabase';

/** Étape 12 : espace de modération (décisions sur les annonces, signalements, membres). */

export type Decision = 'valider' | 'refuser' | 'correction' | 'retirer';

export async function modererAnnonce(id: string, decision: Decision, motif = ''): Promise<boolean> {
  const { data, error } = await supabase.rpc('moderer_annonce', { p_annonce: id, p_decision: decision, p_motif: motif.trim() || null });
  return !error && data === true;
}

export type Signalement = {
  id: string;
  motif: string;
  precisions: string | null;
  cree_le: string;
  annonce_id: string | null;
  annonce_titre: string | null;
  annonce_statut: string | null;
  membre_id: string | null;
  membre_nom: string | null;
  membre_suspendu: boolean | null;
  conversation_id: string | null;
  nb_signalements: number;
};

export async function signalementsATraiter(): Promise<Signalement[]> {
  const { data, error } = await supabase.rpc('signalements_a_traiter');
  if (error) throw error;
  return (data ?? []) as Signalement[];
}

export async function traiterSignalement(id: string, moderateurId: string, traitement: 'traite' | 'rejete') {
  const { error } = await supabase.from('reports').update({ traitement, traite_par: moderateurId }).eq('id', id);
  return !error;
}

export type ActionMembre = 'suspendre' | 'reactiver' | 'exclure';

export async function modererMembre(id: string, action: ActionMembre, motif = ''): Promise<boolean> {
  const { data, error } = await supabase.rpc('moderer_membre', { p_membre: id, p_action: action, p_motif: motif.trim() || null });
  return !error && data === true;
}

export type Historique = {
  membre: {
    id: string;
    nom_affiche: string;
    avatar: number | null;
    wilaya_code: number | null;
    ville: string | null;
    suspendu: boolean;
    exclu: boolean;
    role: string;
    cree_le: string;
    est_pro: boolean;
  } | null;
  annonces: number;
  refusees: { id: string; titre: string; motif: string | null; correction: boolean }[];
  signalements: { id: string; motif: string; precisions: string | null; traitement: string; cree_le: string; annonce_titre: string | null }[];
  actions: { action: string; motif: string | null; cree_le: string; annonce_id: string | null }[];
};

export async function historiqueMembre(id: string): Promise<Historique> {
  const { data, error } = await supabase.rpc('historique_membre', { p_membre: id });
  if (error) throw error;
  return data as Historique;
}

export async function compteurs(): Promise<{ annonces: number; signalements: number }> {
  const [a, s] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('statut', 'verification'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).in('traitement', ['a_traiter', 'en_cours']),
  ]);
  return { annonces: a.count ?? 0, signalements: s.count ?? 0 };
}

/** Texte du motif d'un signalement (codes de l'étape 9 ; anciens textes libres affichés tels quels). */
export const MOTIFS_CONNUS = ['charte', 'photo', 'arnaque', 'doublon', 'categorie', 'autre', 'propos', 'faux_profil'] as const;

/** Sexe d'un membre (privé) : lecture et correction réservées à la modération. */
export async function sexeMembre(id: string): Promise<'h' | 'f' | null> {
  const { data, error } = await supabase.rpc('sexe_membre', { p_membre: id });
  if (error) throw error;
  return (data as 'h' | 'f' | null) ?? null;
}

export async function changerSexeMembre(id: string, sexe: 'h' | 'f'): Promise<boolean> {
  const { data, error } = await supabase.rpc('changer_sexe_membre', { p_membre: id, p_sexe: sexe });
  return !error && data === true;
}
