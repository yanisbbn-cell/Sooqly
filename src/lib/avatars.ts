/**
 * Les 40 images de profil de Sooqly : des illustrations sans visage, jamais de photo.
 * Le numéro (1 à 40) est ce qui est enregistré dans le profil (colonne « avatar »).
 * 1 à 20 : onglet « Hommes » ; 21 à 40 : onglet « Femmes ».
 */
export type GroupeAvatar = 'h' | 'f';

const CLES_H = [
  'palmier', 'dunes', 'montagne', 'croissant', 'lanterne', 'livre', 'calame', 'theiere', 'olivier', 'coupoles',
  'minaret', 'boussole', 'voilier', 'phare', 'cedres', 'tente', 'oasis', 'porte', 'etoile', 'sablier',
] as const;

const CLES_F = [
  'rose', 'jasmin', 'tulipes', 'branche', 'lavande', 'bouquet', 'grenade', 'citronnier', 'plante', 'cactus',
  'lune', 'arcenciel', 'panier', 'fraises', 'zellige', 'mer', 'vase', 'tasse', 'collier', 'plume',
] as const;

export type CleAvatar = (typeof CLES_H)[number] | (typeof CLES_F)[number];

export const AVATARS: { numero: number; cle: CleAvatar; groupe: GroupeAvatar }[] = [
  ...CLES_H.map((cle, i) => ({ numero: i + 1, cle, groupe: 'h' as const })),
  ...CLES_F.map((cle, i) => ({ numero: i + 21, cle, groupe: 'f' as const })),
];

/** Retrouve une image de profil par son numéro (null si le numéro est absent ou inconnu). */
export function avatarParNumero(numero: number | null | undefined) {
  return AVATARS.find((a) => a.numero === numero) ?? null;
}
