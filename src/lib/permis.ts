import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

import { supabase } from './supabase';

/**
 * Permis de conduire (location de véhicules) : photo rangée dans le seau PRIVÉ « documents »,
 * lisible par le seul loueur ; effacée automatiquement par la base le lendemain de la fin de location.
 */

export type StatutDocument = 'en_attente' | 'accepte' | 'refuse';

export type DocumentRecu = {
  id: string;
  fichier: string;
  statut: StatutDocument;
  efface_le: string;
  cree_le: string;
  annonce: { id: string; titre: string } | null;
  expediteur: { id: string; nom_affiche: string; avatar: number | null } | null;
};

const SEAU = 'documents';

/**
 * Envoie le permis : photo allégée, ligne « document privé », puis une bulle « Permis envoyé » dans la discussion
 * (créée si besoin). Renvoie l'identifiant de la discussion, ou null en cas d'échec.
 */
export async function envoyerPermis(p: {
  annonceId: string;
  locataireId: string;
  loueurId: string;
  uri: string;
  dernierJour: string;
}): Promise<string | null> {
  const image = await manipulateAsync(p.uri, [{ resize: { width: 1600 } }], { compress: 0.75, format: SaveFormat.JPEG, base64: true });
  if (!image.base64) return null;
  const chemin = `${p.loueurId}/${p.locataireId}/${Date.now().toString(36)}.jpg`;
  const envoi = await supabase.storage.from(SEAU).upload(chemin, decode(image.base64), { contentType: 'image/jpeg' });
  if (envoi.error) return null;

  // Effacé le lendemain du dernier jour de location.
  const [a, m, j] = p.dernierJour.split('-').map(Number);
  const effaceLe = new Date(a!, m! - 1, j! + 1, 12, 0, 0).toISOString();
  const doc = await supabase
    .from('private_documents')
    .insert({ expediteur_id: p.locataireId, destinataire_id: p.loueurId, annonce_id: p.annonceId, fichier: chemin, efface_le: effaceLe })
    .select('id')
    .single();
  if (doc.error) return null;

  // Discussion avec le loueur : on la retrouve ou on la crée.
  const existante = await supabase.from('conversations').select('id').eq('annonce_id', p.annonceId).eq('acheteur_id', p.locataireId).maybeSingle();
  let conv = existante.data?.id as string | undefined;
  if (!conv) {
    const c = await supabase
      .from('conversations')
      .insert({ annonce_id: p.annonceId, acheteur_id: p.locataireId, vendeur_id: p.loueurId })
      .select('id')
      .single();
    if (c.error) return null;
    conv = c.data.id as string;
  }
  const msg = await supabase.from('messages').insert({ conversation_id: conv, auteur_id: p.locataireId, type: 'permis', contenu: doc.data.id });
  return msg.error ? null : conv;
}

export async function documentsRecus(moi: string): Promise<DocumentRecu[]> {
  const { data, error } = await supabase
    .from('private_documents')
    .select('id, fichier, statut, efface_le, cree_le, annonce:listings(id, titre), expediteur:profiles!private_documents_expediteur_id_fkey(id, nom_affiche, avatar)')
    .eq('destinataire_id', moi)
    .order('cree_le', { ascending: false });
  if (error) throw error;
  return data as unknown as DocumentRecu[];
}

/** Statut d'un permis (pour la bulle de la discussion) ; null s'il a été effacé. */
export async function statutDocument(id: string): Promise<StatutDocument | null> {
  const { data } = await supabase.from('private_documents').select('statut').eq('id', id).maybeSingle();
  return (data?.statut as StatutDocument | undefined) ?? null;
}

/** Lien temporaire (10 minutes) vers la photo : seul le destinataire l'obtient. */
export async function lienDocument(fichier: string): Promise<string | null> {
  const { data } = await supabase.storage.from(SEAU).createSignedUrl(fichier, 600);
  return data?.signedUrl ?? null;
}

export async function repondreDocument(id: string, statut: 'accepte' | 'refuse'): Promise<boolean> {
  const { error } = await supabase.from('private_documents').update({ statut }).eq('id', id);
  return !error;
}

export async function nombreDocumentsEnAttente(moi: string): Promise<number> {
  const { count } = await supabase
    .from('private_documents')
    .select('id', { count: 'exact', head: true })
    .eq('destinataire_id', moi)
    .eq('statut', 'en_attente');
  return count ?? 0;
}
