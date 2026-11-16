/**
 * Adresse du site web de Sooqly (version web d'Expo, hébergée sur Vercel).
 * À remplacer par le nom de domaine définitif à l'étape 15.
 */
export const SITE = 'https://sooqly-two.vercel.app';

/** Lien d'invitation (parrainage) : ouvre l'inscription avec le code déjà rempli. */
export const lienInvitation = (code: string) => `${SITE}/invitation/${code}`;
