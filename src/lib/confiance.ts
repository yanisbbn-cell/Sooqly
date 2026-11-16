import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { supabase } from './supabase';

/**
 * Étape 9 : confiance.
 * - Signaler une annonce ou un membre (anonyme : seule la modération lit les signalements).
 * - Bloquer / débloquer un membre (il n'en est jamais averti).
 * - Déclarer une vente conclue avec un membre, puis se noter l'un l'autre (modifiable 48 h).
 * - Badge « Vendeur validé » : N ventes notées 5 étoiles (réglage settings.seuil_badge). Il ne change jamais l'ordre des annonces.
 */

export const MOTIFS_ANNONCE = ['charte', 'photo', 'arnaque', 'doublon', 'categorie', 'autre'] as const;
export const MOTIFS_MEMBRE = ['arnaque', 'propos', 'faux_profil', 'charte', 'autre'] as const;
export type MotifAnnonce = (typeof MOTIFS_ANNONCE)[number];
export type MotifMembre = (typeof MOTIFS_MEMBRE)[number];

export type Signalement =
  | { genre: 'annonce'; annonceId: string; membreViseId?: string }
  | { genre: 'membre'; membreViseId: string; conversationId?: string };

/** « ok », « deja » (déjà signalé, en cours de traitement) ou « erreur ». */
export async function signaler(auteurId: string, s: Signalement, motif: string, precisions: string): Promise<'ok' | 'deja' | 'erreur'> {
  const { error } = await supabase.from('reports').insert({
    auteur_id: auteurId,
    annonce_id: s.genre === 'annonce' ? s.annonceId : null,
    membre_vise_id: s.genre === 'membre' ? s.membreViseId : null,
    conversation_id: s.genre === 'membre' ? (s.conversationId ?? null) : null,
    motif,
    precisions: precisions.trim() || null,
  });
  if (!error) return 'ok';
  return error.code === '23505' ? 'deja' : 'erreur';
}

// ---------- Blocages ----------

export async function estBloque(membreId: string, autreId: string): Promise<boolean> {
  const { data } = await supabase.from('blocks').select('bloque_id').eq('membre_id', membreId).eq('bloque_id', autreId).maybeSingle();
  return !!data;
}

export async function bloquer(membreId: string, autreId: string) {
  const { error } = await supabase.from('blocks').upsert({ membre_id: membreId, bloque_id: autreId }, { ignoreDuplicates: true });
  return !error;
}

export async function debloquer(membreId: string, autreId: string) {
  const { error } = await supabase.from('blocks').delete().eq('membre_id', membreId).eq('bloque_id', autreId);
  return !error;
}

export type MembreBloque = { bloque_id: string; nom_affiche: string; avatar: number | null; cree_le: string };

export async function mesBlocages(): Promise<MembreBloque[]> {
  const { data, error } = await supabase.rpc('mes_blocages');
  if (error) throw error;
  return (data ?? []) as MembreBloque[];
}

// ---------- Ventes conclues et notes ----------

/** Déclare la vente (ou la location) : l'annonce passe « vendue » / « louée ». Renvoie l'identifiant de la transaction. */
export async function declarerVente(annonceId: string, vendeurId: string, acheteurId: string): Promise<{ id: string | null; deja: boolean }> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ annonce_id: annonceId, vendeur_id: vendeurId, acheteur_id: acheteurId })
    .select('id')
    .single();
  if (error) return { id: null, deja: /déjà été conclue/.test(error.message) };
  return { id: data.id as string, deja: false };
}

/** La transaction déjà conclue sur cette annonce, s'il y en a une (visible seulement par ses deux parties). */
export async function transactionDeLAnnonce(annonceId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('id, acheteur_id, vendeur_id')
    .eq('annonce_id', annonceId)
    .eq('statut', 'conclue')
    .maybeSingle();
  return data as { id: string; acheteur_id: string | null; vendeur_id: string } | null;
}

export type TransactionANoter = {
  transaction_id: string;
  annonce_id: string;
  titre: string;
  type: string;
  date: string;
  mon_role: 'acheteur' | 'vendeur';
  autre_id: string;
  autre_nom: string;
  autre_avatar: number | null;
  note_id: string | null;
  note: number | null;
  critere_1: number | null;
  critere_2: number | null;
  critere_3: number | null;
  note_le: string | null;
};

/** Transactions pas encore notées par moi, et celles dont la note est encore modifiable (48 h). */
export async function transactionsANoter(): Promise<TransactionANoter[]> {
  const { data, error } = await supabase.rpc('transactions_a_noter');
  if (error) throw error;
  return (data ?? []) as TransactionANoter[];
}

/** Les 3 critères, dans l'ordre de critere_1..3, selon qui note. */
export const criteresPour = (monRole: 'acheteur' | 'vendeur') =>
  monRole === 'acheteur'
    ? (['conforme', 'ponctualite', 'comportement'] as const)
    : (['ponctualite', 'paiement', 'comportement'] as const);

export type Note = { note: number; criteres: [number, number, number] };

export async function enregistrerNote(t: TransactionANoter, auteurId: string, n: Note) {
  const valeurs = { note: n.note, critere_1: n.criteres[0], critere_2: n.criteres[1], critere_3: n.criteres[2] };
  const { error } = t.note_id
    ? await supabase.from('ratings').update(valeurs).eq('id', t.note_id)
    : await supabase.from('ratings').insert({
        transaction_id: t.transaction_id,
        auteur_id: auteurId,
        cible_id: t.autre_id,
        role: t.mon_role,
        ...valeurs,
      });
  return !error;
}

// ---------- Profil public et badge ----------

type Moyennes = { nb: number; c1: number | null; c2: number | null; c3: number | null };
export type StatsMembre = {
  moyenne: number | null;
  nb_avis: number;
  ventes_5: number;
  seuil: number;
  ventes: number;
  comme_vendeur: Moyennes;
  comme_acheteur: Moyennes;
};

export async function statsMembre(id: string): Promise<StatsMembre> {
  const { data, error } = await supabase.rpc('profil_membre', { p_membre: id });
  if (error) throw error;
  return data as StatsMembre;
}

export type Avis = { id: string; note: number; role: 'acheteur' | 'vendeur'; cree_le: string; auteur: { nom_affiche: string; avatar: number | null } | null };

export async function avisRecus(id: string, limite = 10): Promise<Avis[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('id, note, role, cree_le, auteur:profiles!ratings_auteur_id_fkey(nom_affiche, avatar)')
    .eq('cible_id', id)
    .order('cree_le', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data as unknown as Avis[];
}

/** Parmi ces membres, ceux qui ont le badge « Vendeur validé ». */
export async function vendeursValides(ids: string[]): Promise<Set<string>> {
  const uniques = [...new Set(ids.filter(Boolean))];
  if (!uniques.length) return new Set();
  const { data } = await supabase.rpc('vendeurs_valides', { p_ids: uniques });
  return new Set((data ?? []) as string[]);
}

// ---------- Badge affiché sur les cartes : demandes regroupées et mémorisées ----------

const badges = new Map<string, boolean>();
const enAttente = new Set<string>();
const abonnes = new Set<() => void>();
let minuterie: ReturnType<typeof setTimeout> | null = null;

function demanderBadge(id: string) {
  if (badges.has(id) || enAttente.has(id)) return;
  enAttente.add(id);
  if (minuterie) return;
  minuterie = setTimeout(async () => {
    minuterie = null;
    const ids = [...enAttente];
    enAttente.clear();
    const valides = await vendeursValides(ids).catch(() => new Set<string>());
    ids.forEach((i) => badges.set(i, valides.has(i)));
    abonnes.forEach((f) => f());
  }, 40);
}

/** Vrai si ce membre a le badge « Vendeur validé » (les cartes d'une liste partagent une seule requête). */
export function useVendeurValide(id: string | null | undefined): boolean {
  const sAbonner = useCallback((f: () => void) => {
    abonnes.add(f);
    return () => {
      abonnes.delete(f);
    };
  }, []);
  const valeur = useSyncExternalStore(sAbonner, () => (id ? (badges.get(id) ?? false) : false));
  useEffect(() => {
    if (id) demanderBadge(id);
  }, [id]);
  return valeur;
}

/** Après une nouvelle note, le badge d'un membre peut changer : on l'oublie pour le redemander. */
export const oublierBadge = (id: string) => badges.delete(id);
