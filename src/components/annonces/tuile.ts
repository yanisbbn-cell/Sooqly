import { colors } from '@/theme';

/** Couleurs de la vignette d'une annonce sans photo, selon l'icône de sa catégorie (comme la maquette). */
export function couleursTuile(icone: string): { fond: string; trait: string } {
  if (['car', 'wheel', 'tool'].includes(icone)) return { fond: colors.sable4, trait: colors.sable1 };
  if (['stroller', 'fridge', 'laptop'].includes(icone)) return { fond: colors.sable2, trait: colors.brun };
  return { fond: colors.sable1, trait: colors.brun };
}
