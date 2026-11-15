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

const COLONNES = 'id, conversation_id, auteur_id, type, contenu, fichier, duree_secondes, lieu_nom, lieu_lat, lieu_lng, lu, cree_le';

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
