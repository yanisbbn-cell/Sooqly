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
} as const;

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
