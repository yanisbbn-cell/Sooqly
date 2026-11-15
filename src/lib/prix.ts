/**
 * Prix de Sooqly : toujours en dinars entiers, jamais de centimes ni de « millions ».
 * Affichage avec une espace fine insécable tous les 3 chiffres : 45000 → « 45 000 ».
 */
export const formaterNombre = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Équivalent indicatif en euros : « ≈ 166,50 € » (taux réglé par l'administrateur).
 * Isolé de gauche à droite (U+2066…U+2069) pour garder cet ordre dans un texte en arabe.
 */
export const formaterEuro = (dinars: number, tauxDinarEuro: number) =>
  `\u2066≈ ${(dinars * tauxDinarEuro).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €\u2069`;

/** Ne garde que les chiffres d'une saisie de prix (« 45 000 DA » → 45000), ou null. */
export function lirePrix(saisie: string): number | null {
  const chiffres = saisie.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!chiffres) return null;
  return Math.min(Number(chiffres), 99_999_999_999);
}

/** Fourchette de prix plausible pour une catégorie et un type d'annonce, ou null si aucune. */
export function fourchette(
  fourchettes: Record<string, [number, number]>,
  type: 'vente' | 'service' | 'don',
): [number, number] | null {
  if (type === 'don') return null;
  return fourchettes[type === 'service' ? 'Service' : 'Vente'] ?? fourchettes.Vente ?? null;
}
