import { supabase } from './supabase';

/** Parrainage : un code par membre, un compteur, aucune récompense en argent. */

const nettoyer = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

/** Vérifié avant l'inscription, pour prévenir d'une faute de frappe. */
export async function codeParrainageExiste(code: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('id').eq('code_parrainage', nettoyer(code)).maybeSingle();
  return !!data;
}

/** Juste après l'inscription : le serveur vérifie le code et enregistre le parrain. */
export async function utiliserCodeParrainage(code: string): Promise<boolean> {
  const { data } = await supabase.rpc('utiliser_code_parrainage', { p_code: nettoyer(code) });
  return data === true;
}

export async function monParrainage(membreId: string): Promise<{ code: string; filleuls: number }> {
  const [p, n] = await Promise.all([
    supabase.from('profiles').select('code_parrainage').eq('id', membreId).single(),
    supabase.rpc('nombre_filleuls'),
  ]);
  if (p.error) throw p.error;
  return { code: (p.data as { code_parrainage: string }).code_parrainage, filleuls: typeof n.data === 'number' ? n.data : 0 };
}
