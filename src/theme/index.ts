import { Platform, type TextStyle } from 'react-native';

/**
 * Thème de Sooqly : toutes les couleurs et polices de l'application.
 * C'est le SEUL endroit où les couleurs sont définies (l'accent n'est pas encore définitif).
 *
 * Règle des couleurs :
 * - accent (terre cuite) = agir
 * - vert = confiance (Vendeur validé, En ligne, vérifié, conseils)
 * - rouge = danger (arnaque, blocage, suppression)
 */
export const colors = {
  // Fond et structure
  blanc: '#FFFFFF',
  brun: '#3B2D22', // en-têtes, textes
  brunMoyen: '#6B5440', // textes secondaires (maquette)
  brunNuit: '#2A2018', // ombres et fonds très foncés (maquette)
  sable1: '#F4E9D8',
  sable2: '#E6D2B6',
  sable3: '#C9AE8B',
  sable4: '#9C7C5D',
  carte: '#F6F0E6',

  // Agir
  accent: '#C4512E', // terre cuite (provisoire)
  accentFonce: '#A9421F', // petits textes d'accent

  // Confiance
  vert: '#2F7A4B',
  vertFond: '#EDF5EF', // fond des encarts de confiance (maquette)
  vertBord: '#C3DCCA',

  // Bouton désactivé (maquette)
  inactif: '#D9C6AA',

  // Danger
  rouge: '#B5453F',
  rougeFond: '#FBE3D6', // fond des alertes (maquette)
} as const;

/**
 * Couleurs des catégories (tuiles de l'accueil et vignettes des annonces sans photo).
 * Tons de terre et de pierre, choisis pour ne pas se confondre avec l'accent (agir), le vert (confiance)
 * ni le rouge (danger). « de » → « a » : dégradé de la tuile ; « clair » : fond des vignettes sans photo.
 * Icône crème sur la tuile : contraste d'au moins 3 pour 1 avec « de ».
 */
export const couleursCategories: Record<string, { de: string; a: string; clair: string }> = {
  grid: { de: '#6A5241', a: '#3B2D22', clair: '#E4E0DD' }, // Tout
  building: { de: '#B07A55', a: '#7E5034', clair: '#F1E7E0' }, // Immobilier : argile
  car: { de: '#5F7C93', a: '#3B5266', clair: '#E2E7EC' }, // Véhicules : bleu ardoise
  wheel: { de: '#6E655C', a: '#433C35', clair: '#E5E3E2' }, // Pièces auto : graphite
  fridge: { de: '#AD7F35', a: '#86601F', clair: '#F0E8DB' }, // Électroménager : ocre
  sofa: { de: '#9C7352', a: '#6E4D33', clair: '#EDE6E0' }, // Ameublement : noyer
  laptop: { de: '#56628E', a: '#343D63', clair: '#E1E3EB' }, // Informatique : indigo nuit
  garment: { de: '#B07A72', a: '#80524C', clair: '#F1E7E6' }, // Vêtements : vieux rose
  stroller: { de: '#8E7CA6', a: '#5F5079', clair: '#EBE7EF' }, // Bébé et enfants : lavande
  tool: { de: '#85834F', a: '#5A5832', clair: '#E9E9DF' }, // Services : olive
  gift: { de: '#9B5A6B', a: '#6A3746', clair: '#EDE1E4' }, // Dons : prune
};

/** Icône posée sur une tuile de catégorie. */
export const iconeTuile = '#FFF8EE';

/**
 * Sur le site, le navigateur dessine un cadre carré autour du champ actif, par-dessus nos champs arrondis :
 * on le retire et chaque champ montre lui-même qu'il est actif (bordure terre cuite).
 */
// « none » n'existe pas dans les types de React Native mais est bien compris par le site (react-native-web).
export const sansContourWeb: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

/**
 * Échelle des tailles de texte (px) : toute taille utilisée dans les écrans en fait partie.
 * 11 mentions · 12 aides · 13 petits textes · 14 texte courant · 15 boutons · 16 titres de cartes
 * 18 titres de blocs · 20 titres de sections · 22 · 24 titres d'écrans · 28 et 30 grands titres et prix de la fiche.
 */
export const tailles = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 30] as const;

/** Noms des polices chargées dans app/_layout.tsx. */
export const fonts = {
  titre: {
    600: 'SpaceGrotesk_600SemiBold',
    700: 'SpaceGrotesk_700Bold',
  },
  texte: {
    400: 'Inter_400Regular',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
  arabe: {
    400: 'IBMPlexSansArabic_400Regular',
    600: 'IBMPlexSansArabic_600SemiBold',
    700: 'IBMPlexSansArabic_700Bold',
  },
  coran: {
    400: 'Amiri_400Regular',
    700: 'Amiri_700Bold',
  },
} as const;

/** Taille minimale d'une zone tactile (en points). */
export const toucheMin = 44;
