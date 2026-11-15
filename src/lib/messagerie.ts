import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Messagerie : une discussion par annonce et par acheteur.
 * Les règles d'accès de la base garantissent que chacun ne lit que ses propres discussions ;
 * la base masque aussi les numéros de téléphone et les e-mails écrits dans les messages.
 */

export type TypeMessage = 'texte' | 'vocal' | 'lieu' | 'permis';

export type Message = {
  id: number;
  conversation_id: string;
  auteur_id: string;
  type: TypeMessage;
  contenu: string | null;
  fichier: string | null;
  duree_secondes: number | null;
  lieu_nom: string | null;
  lieu_lat: number | null;
  lieu_lng: number | null;
  lu: boolean;
  cree_le: string;
  /** Forme d'onde d'un vocal : 48 barres de 0 à 100. */
  onde: number[] | null;
};

export type Discussion = {
  id: string;
  annonce_id: string;
  annonce_titre: string;
  annonce_categorie: string;
  autre_id: string;
  autre_nom: string;
  autre_avatar: number | null;
  je_suis_vendeur: boolean;
  dernier_type: TypeMessage | null;
  dernier_contenu: string | null;
  dernier_auteur: string | null;
  dernier_le: string;
  non_lus: number;
};

/** Mots qui trahissent une demande d'avance (comme la maquette) : une mise en garde rouge s'affiche. */
export const ARNAQUE = /(ccp|baridi|avance|acompte|virement|western|mandat|flexy|حوالة|عربون|تسبيق|بريدي)/i;

const COLONNES = 'id, conversation_id, auteur_id, type, contenu, fichier, duree_secondes, lieu_nom, lieu_lat, lieu_lng, lu, cree_le, onde';

export async function mesDiscussions(): Promise<Discussion[]> {
  const { data, error } = await supabase.rpc('mes_discussions');
  if (error) throw error;
  return data as Discussion[];
}

/** Ouvre la discussion avec le vendeur de cette annonce (la crée si besoin) et envoie le premier message. */
export async function contacter(annonceId: string, acheteurId: string, vendeurId: string, texte: string): Promise<string | null> {
  const existante = await supabase
    .from('conversations')
    .select('id')
    .eq('annonce_id', annonceId)
    .eq('acheteur_id', acheteurId)
    .maybeSingle();
  let id = existante.data?.id as string | undefined;
  if (!id) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ annonce_id: annonceId, acheteur_id: acheteurId, vendeur_id: vendeurId })
      .select('id')
      .single();
    if (error) return null;
    id = data.id as string;
  }
  const ok = await envoyerTexte(id, acheteurId, texte);
  return ok ? id : null;
}

export async function envoyerTexte(conversationId: string, auteurId: string, texte: string): Promise<boolean> {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, auteur_id: auteurId, type: 'texte', contenu: texte.trim() });
  return !error;
}

export async function lireMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(COLONNES)
    .eq('conversation_id', conversationId)
    .order('cree_le', { ascending: true })
    .order('id', { ascending: true })
    .limit(500);
  if (error) throw error;
  return data as Message[];
}

export async function marquerLus(conversationId: string, moi: string) {
  await supabase.from('messages').update({ lu: true }).eq('conversation_id', conversationId).neq('auteur_id', moi).eq('lu', false);
}

/** Les nouveaux messages arrivent en temps réel (uniquement ceux que la personne a le droit de lire). */
export function ecouterMessages(nom: string, filtre: string | null, quandNouveau: (m: Message) => void): RealtimeChannel {
  return supabase
    .channel(nom)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', ...(filtre ? { filter: filtre } : {}) },
      (charge) => quandNouveau(charge.new as Message),
    )
    .subscribe();
}

export async function lireDiscussion(id: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, annonce_id, acheteur_id, vendeur_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; annonce_id: string; acheteur_id: string; vendeur_id: string } | null;
}

// ---------- Messages vocaux et lieu de rendez-vous (étape 7, morceau 2) ----------

const SEAU_VOCAUX = 'vocaux';

/** Envoie un message vocal : le fichier va dans le seau privé, rangé sous l'identifiant de la discussion. */
export async function envoyerVocal(
  conversationId: string,
  auteurId: string,
  uri: string,
  dureeSecondes: number,
  onde: number[],
): Promise<boolean> {
  const reponse = await fetch(uri);
  const contenu = await reponse.arrayBuffer();
  // Sur le web, l'enregistrement est un « blob » sans extension (format webm) ; sur téléphone, un fichier .m4a.
  const extension = /\.([a-z0-9]{2,4})$/i.exec(uri.split('?')[0]!)?.[1]?.toLowerCase() ?? (uri.startsWith('blob:') ? 'webm' : 'm4a');
  const type = extension === 'webm' ? 'audio/webm' : extension === 'wav' ? 'audio/wav' : 'audio/mp4';
  const chemin = `${conversationId}/${Date.now().toString(36)}.${extension}`;
  const envoi = await supabase.storage.from(SEAU_VOCAUX).upload(chemin, contenu, { contentType: type });
  if (envoi.error) return false;
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    auteur_id: auteurId,
    type: 'vocal',
    fichier: chemin,
    duree_secondes: Math.max(1, Math.round(dureeSecondes)),
    onde: onde.length ? onde : null,
  });
  return !error;
}

/** Lien temporaire (1 heure) pour écouter un vocal : seuls les membres de la discussion l'obtiennent. */
export async function lienVocal(chemin: string): Promise<string | null> {
  const { data } = await supabase.storage.from(SEAU_VOCAUX).createSignedUrl(chemin, 3600);
  return data?.signedUrl ?? null;
}

export async function envoyerLieu(
  conversationId: string,
  auteurId: string,
  nom: string,
  position: { lat: number; lng: number } | null,
): Promise<boolean> {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    auteur_id: auteurId,
    type: 'lieu',
    lieu_nom: nom.trim(),
    lieu_lat: position?.lat ?? null,
    lieu_lng: position?.lng ?? null,
  });
  return !error;
}
