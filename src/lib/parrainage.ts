import { supabase } from './supabase';

/** Parrainage : un code par membre, un compteur, aucune récompense en argent. */

const nettoyer = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

/** Vérifié avant l'inscription, pour prévenir d'une faute de frappe. */
export async function codeParrainageExiste(code: string): Promise<boolean> {
  const { data } = await supabase.rpc('code_parrainage_existe', { p_code: nettoyer(code) });
  return data === true;
}

/** Juste après l'inscription : le serveur vérifie le code et enregistre le parrain. */
export async function utiliserCodeParrainage(code: string): Promise<boolean> {
  const { data } = await supabase.rpc('utiliser_code_parrainage', { p_code: nettoyer(code) });
  return data === true;
}

export async function monParrainage(): Promise<{ code: string; filleuls: number }> {
  // Le code n'est lisible que par son propriétaire (colonne cachée au public).
  const [p, n] = await Promise.all([supabase.rpc('mon_code_parrainage'), supabase.rpc('nombre_filleuls')]);
  if (p.error || typeof p.data !== 'string') throw p.error ?? new Error('code absent');
  return { code: p.data, filleuls: typeof n.data === 'number' ? n.data : 0 };
}
