/**
 * Numéros de téléphone acceptés à l'inscription : mobiles d'Algérie, de France, de Belgique,
 * d'Espagne, d'Allemagne et d'Italie (décision de Yanis du 15 novembre 2026).
 */
export type Pays = {
  cle: 'dz' | 'fr' | 'be' | 'es' | 'de' | 'it';
  indicatif: string;
  /** Format d'un mobile, sans l'indicatif ni le 0 du début. */
  format: RegExp;
  longueurMax: number;
  exemple: string;
};

export const PAYS: Pays[] = [
  { cle: 'dz', indicatif: '213', format: /^[567]\d{8}$/, longueurMax: 9, exemple: '5XX XX XX XX' },
  { cle: 'fr', indicatif: '33', format: /^[67]\d{8}$/, longueurMax: 9, exemple: '6 XX XX XX XX' },
  { cle: 'be', indicatif: '32', format: /^4\d{8}$/, longueurMax: 9, exemple: '4XX XX XX XX' },
  { cle: 'es', indicatif: '34', format: /^[67]\d{8}$/, longueurMax: 9, exemple: '6XX XXX XXX' },
  { cle: 'de', indicatif: '49', format: /^1[5-7]\d{8,9}$/, longueurMax: 11, exemple: '15X XXXXXXXX' },
  { cle: 'it', indicatif: '39', format: /^3\d{8,9}$/, longueurMax: 10, exemple: '3XX XXX XXXX' },
];

/** Ne garde que les chiffres et retire le 0 du début (« 06 12… » → « 6 12… »). */
export const nettoyer = (saisie: string, pays: Pays) =>
  saisie.replace(/\D/g, '').replace(/^0+/, '').slice(0, pays.longueurMax);

export const numeroValide = (saisie: string, pays: Pays) => pays.format.test(nettoyer(saisie, pays));

/** Numéro complet au format international : « +33612345678 ». */
export const numeroComplet = (saisie: string, pays: Pays) => `+${pays.indicatif}${nettoyer(saisie, pays)}`;
