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
 * Palette « Beige & Terre », choisie par Yanis le 17 novembre 2026 (tons doux et chaleureux).
 * « de » → « a » : dégradé vertical de la tuile, nettement plus foncé en bas (icône crème, le nom de la catégorie est toujours écrit dessous) ;
 * « clair » : fond des vignettes sans photo ; « trait » : icône sur ce fond (contraste d'au moins 3,5 pour 1).
 */
export const couleursCategories: Record<string, { de: string; a: string; clair: string; trait: string }> = {
  grid: { de: '#997D61', a: '#64523F', clair: '#EDE8E3', trait: '#896F52' }, // Tout : brun doux
  building: { de: '#E3A783', a: '#D3753C', clair: '#FAEFE9', trait: '#BD6835' }, // Immobilier : abricot
  car: { de: '#C09F87', a: '#9E7253', clair: '#F4EEE9', trait: '#9C7659' }, // Véhicules : taupe
  wheel: { de: '#C7BA8D', a: '#AA9653', clair: '#F5F3EA', trait: '#8E7E4B' }, // Pièces auto : olive clair
  fridge: { de: '#DDBA7F', a: '#CB953A', clair: '#F9F3E8', trait: '#A67931' }, // Électroménager : miel
  sofa: { de: '#C4997F', a: '#A26B4B', clair: '#F4EDE8', trait: '#A17355' }, // Ameublement : noisette
  laptop: { de: '#D0BCA5', a: '#B2926C', clair: '#F7F3EF', trait: '#977B56' }, // Informatique : lin
  garment: { de: '#D48D70', a: '#B65C37', clair: '#F7EAE5', trait: '#B76440' }, // Vêtements : terre cuite douce
  stroller: { de: '#DFB09E', a: '#C97B5D', clair: '#F9F1EE', trait: '#BB6C4E' }, // Bébé et enfants : rose poudré
  tool: { de: '#A4A375', a: '#75744D', clair: '#EFEEE6', trait: '#818052' }, // Services : sauge
  gift: { de: '#DAAE80', a: '#C6833D', clair: '#F8F0E8', trait: '#AB733D' }, // Dons : caramel
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
