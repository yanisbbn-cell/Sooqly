/** Forme d'onde des vocaux (façon Telegram) : niveaux sonores relevés pendant l'enregistrement. */

export const NB_BARRES = 48;

/** Niveau du micro en décibels (-160 à 0) → hauteur de 0 à 1 (la voix se situe vers -50 à -10 dB). */
export const niveau = (db: number | undefined) => (db === undefined ? 0 : Math.max(0, Math.min(1, (db + 55) / 45)));

/** Réduit tous les relevés en 48 barres (la plus haute de chaque groupe), de 0 à 100. */
export function reduire(releves: number[], nb = NB_BARRES): number[] {
  if (!releves.length) return [];
  const barres: number[] = [];
  for (let i = 0; i < nb; i++) {
    const debut = Math.floor((i * releves.length) / nb);
    const fin = Math.max(debut + 1, Math.floor(((i + 1) * releves.length) / nb));
    const groupe = releves.slice(debut, fin);
    barres.push(Math.round(Math.max(...(groupe.length ? groupe : [0])) * 100));
  }
  return barres;
}
