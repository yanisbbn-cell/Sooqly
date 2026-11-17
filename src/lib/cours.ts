import type { TFunction } from 'i18next';

import type { AnnonceResume } from './annonces';

/**
 * Mention d'une annonce de cours particuliers, par exemple « Cours donnés par une femme · Enfants (primaire, collège) ».
 * Null pour toute autre annonce.
 */
export function mentionCours(a: Pick<AnnonceResume, 'public_cours' | 'sexe_auteur'>, t: TFunction): string | null {
  if (!a.public_cours || !a.sexe_auteur) return null;
  const par = t(a.sexe_auteur === 'f' ? 'cours.parFemme' : 'cours.parHomme');
  const pour =
    a.public_cours === 'enfants' ? t('cours.pourEnfants') : t(a.sexe_auteur === 'f' ? 'cours.pourFemmes' : 'cours.pourHommes');
  return `${par} · ${pour}`;
}
