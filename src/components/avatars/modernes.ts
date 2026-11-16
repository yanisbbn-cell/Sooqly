import type { Degrade, Dessin, Forme } from './dessins';

/**
 * Images de profil au style modernisé (dégradés, formes nettes, léger relief), zone 64 × 64.
 * Règle du projet : AUCUN être animé (ni personne, ni visage, ni animal). Blasons originaux,
 * jamais ceux de vrais clubs (marques protégées). Voitures sans marque.
 */

// ---------- Couleurs propres aux illustrations ----------
export const c = {
  blanc: '#FFFFFF',
  creme: '#FBF5EA',
  sable: '#F4E9D8',
  sable2: '#E6D2B6',
  sable3: '#C9AE8B',
  brun: '#3B2D22',
  brunMoyen: '#6B5440',
  vertDz: '#1E7A3E',
  vertDzClair: '#2E9A55',
  rougeDz: '#D2232A',
  or: '#E9B949',
  orFonce: '#B9861E',
  orClair: '#F8DF96',
  ciel: '#8FC3DD',
  cielClair: '#DDEFF6',
  nuit: '#1E2A44',
  nuitClair: '#38507A',
  pelouse: '#3E9B5A',
  pelouseFonce: '#2C7A45',
  noir: '#25221F',
  gris: '#9AA0A6',
  grisClair: '#D9DDE1',
  rouge: '#C8322B',
  rougeFonce: '#8E1F1A',
  kaki: '#6E7F4E',
  kakiFonce: '#4C5A33',
  orange: '#F2A65A',
  peche: '#F9D9A0',
};

// ---------- Petits outils ----------
const n = (v: number) => Math.round(v * 100) / 100;
const dg = (de: string, a: string, sens?: Degrade['sens']): Degrade => ({ de, a, sens });
const P = (d: string, f: string | Degrade, x: Partial<Forme> = {}): Forme => ({ t: 'p', d, f, ...x }) as Forme;
const T = (d: string, s: string, w = 2, o?: number): Forme => ({ t: 'p', d, s, w, o });
const C = (cx: number, cy: number, r: number, f: string | Degrade, o?: number): Forme => ({ t: 'c', cx, cy, r, f, o });
const R = (x: number, y: number, l: number, h: number, f: string | Degrade, rx = 0, o?: number): Forme => ({ t: 'r', x, y, l, h, rx, f, o });
const E = (cx: number, cy: number, rx: number, ry: number, f: string | Degrade, rot?: [number, number, number], o?: number): Forme => ({
  t: 'e', cx, cy, rx, ry, f, rot, o,
});

/** Étoile à « b » branches. */
function etoile(cx: number, cy: number, r: number, f: string | Degrade, b = 5, interieur = 0.45, depart = -90): Forme {
  const pts: string[] = [];
  for (let i = 0; i < b * 2; i++) {
    const rr = i % 2 === 0 ? r : r * interieur;
    const a = ((depart + (i * 180) / b) * Math.PI) / 180;
    pts.push(`${n(cx + rr * Math.cos(a))} ${n(cy + rr * Math.sin(a))}`);
  }
  return P(`M${pts.join('L')}Z`, f);
}

/** Polygone régulier. */
function polygone(cx: number, cy: number, r: number, cotes: number, f: string | Degrade, depart = -90): Forme {
  const pts: string[] = [];
  for (let i = 0; i < cotes; i++) {
    const a = ((depart + (i * 360) / cotes) * Math.PI) / 180;
    pts.push(`${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`);
  }
  return P(`M${pts.join('L')}Z`, f);
}

/** Croissant tourné vers la droite (comme sur le drapeau algérien) : rond extérieur r, creusé par un rond décalé. */
function croissant(cx: number, cy: number, r: number, f: string | Degrade): Forme {
  const r2 = r * 0.8;
  const d = r * 0.32;
  const a = (r * r - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r * r - a * a);
  const x = n(cx + a);
  return P(`M${x} ${n(cy - h)}A${n(r)} ${n(r)} 0 1 0 ${x} ${n(cy + h)}A${n(r2)} ${n(r2)} 0 1 1 ${x} ${n(cy - h)}Z`, f);
}

/** Reflet discret (haut à gauche). */
const reflet = (d: string, o = 0.35): Forme => P(d, c.blanc, { o } as Partial<Forme>);

/** Feuille de laurier inclinée. */
const feuille = (cx: number, cy: number, angle: number, f: string | Degrade): Forme => E(cx, cy, 2, 4.6, f, [angle, cx, cy]);

/** Couronne de laurier (deux branches). */
function laurier(f: string | Degrade): Forme[] {
  const formes: Forme[] = [T('M24 50Q12 42 14 26', c.orFonce, 1.4), T('M40 50Q52 42 50 26', c.orFonce, 1.4)];
  const g = [
    [15.5, 30, -20], [14.6, 36, -40], [16.8, 42, -60], [20.6, 46.8, -75],
  ];
  for (const [x, y, a] of g) {
    formes.push(feuille(x, y, a, f));
    formes.push(feuille(64 - x, y, -a, f));
  }
  return formes;
}

/** Roue de voiture. */
const roue = (x: number, y: number, r: number): Forme[] => [C(x, y, r, c.noir), C(x, y, n(r * 0.55), dg(c.grisClair, c.gris)), C(x, y, n(r * 0.18), c.noir)];

export const EXEMPLES: Record<string, Dessin> = {
  // ===== Algérie =====
  drapeau: {
    fond: dg(c.cielClair, c.ciel),
    formes: [
      R(11, 12, 2.6, 44, dg(c.sable3, c.brunMoyen, 'h'), 1.3),
      C(12.3, 11.5, 2, c.or),
      // Drapeau qui flotte : moitié verte (côté mât), moitié blanche.
      P('M13.5 16C24 12 34 20 44 16C48 14.5 51 14.2 54 15V41C51 40.2 48 40.5 44 42C34 46 24 38 13.5 42Z', c.blanc),
      P('M13.5 16C19 14 23.5 14.4 28.5 15.9V39.9C23.5 38.5 19 39.4 13.5 42Z', c.vertDz),
      croissant(33, 29, 7, c.rougeDz),
      etoile(38.2, 29, 3.3, c.rougeDz, 5, 0.42, -90 + 18),
      reflet('M13.5 16C24 12 34 20 44 16C48 14.5 51 14.2 54 15V18C51 17.2 48 17.5 44 19C34 23 24 15 13.5 19Z', 0.18),
    ],
  },
  maqam: {
    fond: dg('#9CC9E2', '#F5E3C3'),
    formes: [
      R(0, 50, 64, 14, dg(c.sable2, c.sable3)),
      // Trois palmes de béton qui se rejoignent (Maqam Echahid), anneau à mi-hauteur, flamme au pied.
      P('M27 51C24 38 20 24 14 9C21.5 14 27.5 28 31 51Z', dg('#FFFFFF', '#CDBFA9', 'h')),
      P('M37 51C40 38 44 24 50 9C42.5 14 36.5 28 33 51Z', dg('#D8CAB4', '#FBF7F0', 'h')),
      P('M29.2 51C29.2 36 30.4 20 32 5C33.6 20 34.8 36 34.8 51Z', dg('#FFFFFF', '#DCCFBB', 'h')),
      P('M20.5 28.5Q32 32.5 43.5 28.5V31.8Q32 35.8 20.5 31.8Z', dg('#B89B78', '#8F7458')),
      R(17, 49.5, 30, 3.5, dg(c.sable3, c.brunMoyen), 1.2),
      P('M32 41C29.6 44 30 47.5 32 48.5C34 47.5 34.4 44 32 41Z', dg(c.or, c.rougeDz)),
    ],
  },
  // ===== Sport =====
  ballon: {
    fond: dg(c.pelouse, c.pelouseFonce),
    formes: [
      R(0, 0, 64, 9, c.blanc, 0, 0.06), R(0, 18, 64, 9, c.blanc, 0, 0.06), R(0, 36, 64, 9, c.blanc, 0, 0.06), R(0, 54, 64, 9, c.blanc, 0, 0.06),
      E(33, 51, 14, 3, c.noir, undefined, 0.25),
      C(32, 31, 16, dg(c.blanc, c.grisClair, 'd')),
      polygone(32, 31, 5.2, 5, c.noir),
      ...[0, 1, 2, 3, 4].flatMap((i) => {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        const x1 = n(32 + 5.2 * Math.cos(a));
        const y1 = n(31 + 5.2 * Math.sin(a));
        const x2 = n(32 + 11 * Math.cos(a));
        const y2 = n(31 + 11 * Math.sin(a));
        return [T(`M${x1} ${y1}L${x2} ${y2}`, c.noir, 1.2), polygone(n(32 + 14 * Math.cos(a)), n(31 + 14 * Math.sin(a)), 3.4, 5, c.noir, -90 + i * 72 + 36)];
      }),
      T('M32 15A16 16 0 0 1 32 47A16 16 0 0 1 32 15', c.noir, 0.8, 0.5),
      reflet('M21 22Q24 17 30 16Q24 19 22.5 24Z', 0.6),
    ],
  },
  maillot: {
    fond: dg(c.sable, c.sable2),
    formes: [
      E(32, 55, 16, 2.6, c.brun, undefined, 0.12),
      P('M22 14L28 11.5C29 15 35 15 36 11.5L42 14L53 22L47.5 30L43 26.5V53H21V26.5L16.5 30L11 22Z', dg(c.vertDzClair, c.vertDz)),
      T('M28 11.5C29 15.5 35 15.5 36 11.5', c.blanc, 2.2),
      T('M47.6 29.6L53 22', c.blanc, 2.2), T('M16.4 29.6L11 22', c.blanc, 2.2),
      R(21, 33, 22, 3.2, c.blanc, 0, 0.9),
      R(21, 36.2, 22, 1.6, c.rougeDz, 0, 0.9),
      etoile(37.5, 22.5, 2.6, c.or),
      reflet('M22 14L28 11.5C28.5 13 29 14 30 14.8L23 17L23.5 50H21V26.5L16.5 30L11 22Z', 0.12),
    ],
  },
  trophee: {
    fond: dg(c.nuit, c.nuitClair),
    formes: [
      C(12, 14, 0.9, c.blanc, 0.7), C(51, 10, 1.1, c.blanc, 0.8), C(55, 26, 0.7, c.blanc, 0.6), C(9, 30, 0.7, c.blanc, 0.5),
      T('M22 18H15C15 27 19 31 24 31', c.orFonce, 2.6), T('M42 18H49C49 27 45 31 40 31', c.orFonce, 2.6),
      P('M21 13H43V22C43 31 38 36 32 36C26 36 21 31 21 22Z', dg(c.orClair, c.orFonce, 'h')),
      R(29.5, 36, 5, 7, c.orFonce),
      R(23, 43, 18, 5, dg(c.or, c.orFonce), 1.5),
      R(20, 48, 24, 5, c.brun, 1.5),
      etoile(32, 23, 4.2, c.blanc, 5, 0.45),
      reflet('M23.5 14.5H27V24C27 29 28.5 32 30 34C26 32.5 23.5 28.5 23.5 23Z', 0.35),
    ],
  },
  // ===== Voitures =====
  sportive: {
    fond: dg(c.cielClair, '#F7EAD6'),
    formes: [
      R(0, 45, 64, 19, dg('#6D6A66', '#4A4744')),
      R(6, 52, 8, 1.6, c.blanc, 0.8, 0.8), R(24, 52, 8, 1.6, c.blanc, 0.8, 0.8), R(42, 52, 8, 1.6, c.blanc, 0.8, 0.8),
      E(32, 45.5, 25, 2.2, c.noir, undefined, 0.3),
      P('M6 41C7 35 13 33 19 32L28 26C32 24 38 23.6 43 25L51 30C55 31 59 33 59 37.5V41Z', dg('#E44A3E', c.rougeFonce)),
      P('M25.5 31.5L30 27.6C33 26 37.5 25.6 41 26.6L47 31.5Z', dg(c.nuitClair, c.nuit)),
      T('M36 26V31.5', c.rouge, 1.2),
      R(54.5, 34.5, 3.6, 1.8, c.orClair, 0.8),
      R(6.5, 36.5, 2.6, 2, c.rougeFonce, 0.6),
      ...roue(17, 41, 5.6), ...roue(48, 41, 5.6),
      reflet('M12 33.5C16 32.2 20 31.8 26 31.2L24 33C19 33.4 15 34 12 35Z', 0.45),
    ],
  },
  quatrequatre: {
    fond: dg('#F8E3B5', '#F1C98A'),
    formes: [
      C(50, 15, 6, '#FFF3D6', 0.9),
      P('M0 49Q16 42 34 47T64 45V64H0Z', dg('#E8C489', '#D2A564')),
      E(33, 49, 23, 2.4, c.brun, undefined, 0.25),
      R(12, 27, 42, 15, dg(c.kaki, c.kakiFonce), 3),
      P('M18 27L22 17.5H45L50 27Z', dg('#7E9060', c.kaki)),
      R(23.5, 19.5, 9, 6.5, dg(c.cielClair, c.ciel), 1), R(35, 19.5, 9.5, 6.5, dg(c.cielClair, c.ciel), 1),
      T('M21 15.5H47', c.noir, 1.6), T('M25 15.5V17.5M43 15.5V17.5', c.noir, 1.4),
      R(52.5, 30, 3, 2.5, c.orClair, 1),
      C(10, 34, 5, c.noir), C(10, 34, 2.4, c.gris),
      ...roue(21, 43, 6.4), ...roue(45, 43, 6.4),
      reflet('M13 28.5H52V30.5H13Z', 0.2),
    ],
  },
  // ===== Blasons =====
  blasonDz: {
    fond: dg('#2B2119', c.brun),
    formes: [
      P('M32 9L51 15.5V30C51 42.5 42.5 50.5 32 55.5C21.5 50.5 13 42.5 13 30V15.5Z', c.blanc),
      P('M32 9L13 15.5V30C13 42.5 21.5 50.5 32 55.5Z', c.vertDz),
      croissant(31, 31, 7.6, c.rougeDz),
      etoile(36.6, 31, 3.4, c.rougeDz, 5, 0.42, -72),
      T('M32 9L51 15.5V30C51 42.5 42.5 50.5 32 55.5C21.5 50.5 13 42.5 13 30V15.5Z', c.or, 2.4),
      reflet('M32 10.5L15 16.4V22L32 16Z', 0.18),
    ],
  },
  blasonLaurier: {
    fond: dg('#1F5A36', c.vertDz),
    formes: [
      ...laurier(dg(c.orClair, c.or)),
      C(32, 30, 11.5, dg(c.nuitClair, c.nuit)),
      T('M32 18.5A11.5 11.5 0 1 1 31.9 18.5', c.or, 1.6),
      etoile(32, 30, 7, dg(c.orClair, c.or), 5, 0.45),
      P('M22 47L32 44L42 47L40 52L32 49.5L24 52Z', c.rougeDz),
    ],
  },
  // ===== Nature (thème actuel modernisé) =====
  palmierModerne: {
    fond: dg('#F08E5A', c.peche),
    formes: [
      C(42, 32, 11, '#FCE7C4', 0.95),
      R(0, 46, 64, 18, dg('#E9A86E', '#C97E4F')),
      P('M0 50Q20 45 40 49T64 47V64H0Z', dg('#9C5A3A', '#6B3B26')),
      T('M24 53Q21 40 27 25', c.brun, 3),
      P('M27 25Q16 19 7 25Q17 21.5 27 25.8Z', c.brun),
      P('M27 25Q38 18 48 22Q37 21 27.4 25.8Z', c.brun),
      P('M27 25Q19 13 11 12Q21 16 26.6 25.6Z', c.brun),
      P('M27 25Q33 12 42 10Q33 16 27.6 25.6Z', c.brun),
      P('M27 25Q22 31 18 38Q24 31.5 27.6 25.6Z', c.brun),
      P('M27 25Q34 29 38 36Q31.5 30 26.6 25.8Z', c.brun),
      C(27, 25, 1.6, c.brun),
    ],
  },
};
