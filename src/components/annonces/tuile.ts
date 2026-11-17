import { couleursCategories } from '@/theme';

/** Couleurs d'une catégorie selon son icône : tuile en dégradé (de → a), vignette sans photo (fond clair, trait foncé). */
export function couleursTuile(icone: string): { fond: string; trait: string; de: string; a: string } {
  const c = couleursCategories[icone] ?? couleursCategories.grid!;
  return { fond: c.clair, trait: c.a, de: c.de, a: c.a };
}
