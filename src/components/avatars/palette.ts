import { colors } from '@/theme';

/**
 * Palette des images de profil.
 * Les couleurs de base viennent du thème de Sooqly ; les teintes en plus (ciel, nuit, rose…)
 * ne servent QUE dans ces illustrations et ne doivent pas être utilisées dans les écrans.
 */
export const p = {
  // Thème
  blanc: colors.blanc,
  brun: colors.brun,
  brunMoyen: colors.brunMoyen,
  sable1: colors.sable1,
  sable2: colors.sable2,
  sable3: colors.sable3,
  sable4: colors.sable4,
  carte: colors.carte,
  accent: colors.accent,
  accentFonce: colors.accentFonce,
  vert: colors.vert,

  // Teintes propres aux illustrations
  ciel: '#BFDDE6',
  cielClair: '#DCEEF2',
  nuit: '#27344F',
  nuitClair: '#3C4C6E',
  mer: '#3F7C96',
  merClair: '#7FB3C4',
  jaune: '#EBB949',
  jauneClair: '#F6DC8E',
  orange: '#E58B3A',
  peche: '#F3C6A0',
  rose: '#E79AA3',
  roseClair: '#F8DADB',
  roseFonce: '#C2586A',
  lavande: '#9A86C6',
  lavandeClair: '#E5DDF3',
  vertClair: '#7FB069',
  vertFonce: '#1F5A36',
  vertEau: '#DCEBD9',
  rouge: '#C8423A',
} as const;
