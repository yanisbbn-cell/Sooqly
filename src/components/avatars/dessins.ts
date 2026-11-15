import type { CleAvatar } from '@/lib/avatars';

import { p } from './palette';

/**
 * Les 40 images de profil, décrites comme des listes de formes simples (zone de dessin : 64 × 64).
 * Règle du projet : AUCUN être animé (ni personne, ni visage, ni animal) — seulement des objets,
 * des plantes, des paysages et des motifs géométriques.
 */

type Style = {
  /** couleur de remplissage */ f?: string;
  /** couleur du trait */ s?: string;
  /** épaisseur du trait */ w?: number;
  /** opacité */ o?: number;
};

export type Forme =
  | ({ t: 'p'; d: string } & Style)
  | ({ t: 'c'; cx: number; cy: number; r: number } & Style)
  | ({ t: 'r'; x: number; y: number; l: number; h: number; rx?: number } & Style)
  | ({ t: 'e'; cx: number; cy: number; rx: number; ry: number; rot?: [number, number, number] } & Style);

export type Dessin = { fond: string; formes: Forme[] };

// ---------- Petits outils de dessin ----------
const P = (d: string, f: string, x: Style = {}): Forme => ({ t: 'p', d, f, ...x });
/** Trait (sans remplissage). */
const T = (d: string, s: string, w = 2, x: Style = {}): Forme => ({ t: 'p', d, s, w, ...x });
const C = (cx: number, cy: number, r: number, f: string, x: Style = {}): Forme => ({ t: 'c', cx, cy, r, f, ...x });
const R = (x: number, y: number, l: number, h: number, f: string, rx = 0, st: Style = {}): Forme => ({
  t: 'r', x, y, l, h, rx, f, ...st,
});
const E = (cx: number, cy: number, rx: number, ry: number, f: string, rot?: [number, number, number], x: Style = {}): Forme => ({
  t: 'e', cx, cy, rx, ry, f, rot, ...x,
});
const n = (v: number) => Math.round(v * 100) / 100;

/** Fleur vue de face : « nb » pétales autour d'un cœur. */
function fleur(cx: number, cy: number, r: number, petale: string, coeur: string, nb = 5, depart = 0): Forme[] {
  const formes: Forme[] = [];
  for (let i = 0; i < nb; i++) {
    formes.push(E(cx, n(cy - r * 0.55), n(r * 0.36), n(r * 0.5), petale, [n(depart + (i * 360) / nb), cx, cy]));
  }
  formes.push(C(cx, cy, n(r * 0.28), coeur));
  return formes;
}

/** Étoile à 8 branches (deux carrés croisés). */
function etoile8(cx: number, cy: number, r: number, f: string): Forme[] {
  const a = n(r * 0.7071);
  return [
    P(`M${cx - a} ${cy - a}h${2 * a}v${2 * a}h${-2 * a}z`, f),
    P(`M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}z`, f),
  ];
}

/** Petite étoile du ciel à 4 branches. */
const etincelle = (x: number, y: number, r: number, f: string): Forme =>
  P(`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z`, f);

/** Nuage posé sur la ligne y. */
function nuage(x: number, y: number, e: number, f: string): Forme[] {
  return [
    C(x, n(y - 3 * e), n(4 * e), f),
    C(n(x + 5 * e), n(y - 5 * e), n(5 * e), f),
    C(n(x + 10 * e), n(y - 3 * e), n(4 * e), f),
    R(n(x - 3 * e), n(y - 4 * e), n(16 * e), n(4 * e), f, n(2 * e)),
  ];
}

/** Palmier : tronc courbe et palmes. */
function palmier(x: number, y: number, h: number, tronc: string, palme: string): Forme[] {
  const tx = n(x + h * 0.14);
  const ty = n(y - h);
  const pl = (dx: number, dy: number, cx: number, cy: number): Forme =>
    P(
      `M${tx} ${ty}Q${n(tx + cx * h)} ${n(ty + cy * h)} ${n(tx + dx * h)} ${n(ty + dy * h)}Q${n(tx + cx * h * 0.8)} ${n(ty + cy * h * 0.3 + 0.12 * h)} ${tx} ${ty}z`,
      palme,
    );
  return [
    T(`M${x} ${y}Q${n(x - h * 0.08)} ${n(y - h * 0.5)} ${tx} ${ty}`, tronc, n(h * 0.09)),
    pl(-0.62, 0.12, -0.4, -0.3),
    pl(0.62, 0.12, 0.4, -0.3),
    pl(-0.45, -0.3, -0.2, -0.42),
    pl(0.45, -0.3, 0.2, -0.42),
    pl(-0.5, 0.42, -0.5, 0.0),
    pl(0.5, 0.42, 0.5, 0.0),
    C(tx, ty, n(h * 0.05), tronc),
  ];
}

/** Tulipe : tige, feuille et corolle. */
function tulipe(x: number, y: number, h: number, f: string, fonce: string): Forme[] {
  const yt = y - h;
  return [
    T(`M${x} ${y}V${yt + 4}`, p.vert, 2.2),
    P(`M${x} ${y - 2}Q${x - 8} ${y - 10} ${x - 6} ${y - h * 0.62}Q${x - 1} ${y - 12} ${x} ${y - 2}z`, p.vertClair),
    P(`M${x - 6} ${yt + 5}Q${x - 7} ${yt - 6} ${x - 3.5} ${yt - 8}L${x} ${yt - 3}L${x + 3.5} ${yt - 8}Q${x + 7} ${yt - 6} ${x + 6} ${yt + 5}Q${x} ${yt + 10} ${x - 6} ${yt + 5}z`, f),
    P(`M${x} ${yt - 9}Q${x + 4} ${yt - 2} ${x} ${yt + 8}Q${x - 4} ${yt - 2} ${x} ${yt - 9}z`, fonce),
  ];
}

/** Fraise avec ses graines et sa collerette verte. */
function fraise(x: number, y: number, e: number): Forme[] {
  const q = (dx: number, dy: number) => `${n(x + dx * e)} ${n(y + dy * e)}`;
  return [
    P(`M${q(-10, -6)}Q${q(0, -12)} ${q(10, -6)}Q${q(13, 6)} ${q(0, 15)}Q${q(-13, 6)} ${q(-10, -6)}z`, p.rouge),
    ...[[-5, -2], [0, -3], [5, -2], [-3, 3], [3, 3], [0, 8], [-6, 3.5], [6, 3.5]].map(([dx, dy]) =>
      E(n(x + dx! * e), n(y + dy! * e), n(0.8 * e), n(1.2 * e), p.jauneClair),
    ),
    P(`M${q(0, -8)}L${q(-9, -10)}L${q(-5, -6)}L${q(-8, -2)}L${q(0, -6)}L${q(8, -2)}L${q(5, -6)}L${q(9, -10)}z`, p.vert),
    T(`M${q(0, -8)}Q${q(1, -12)} ${q(3, -14)}`, p.vertFonce, n(1.6 * e)),
  ];
}

/** Cèdre : tronc et étages de branches à plat. */
function cedre(x: number, y: number, h: number, f: string): Forme[] {
  const l = h * 0.42;
  const etage = (k: number, largeur: number): Forme => {
    const yy = y - h * k;
    return P(`M${n(x - largeur)} ${n(yy)}Q${x} ${n(yy - h * 0.26)} ${n(x + largeur)} ${n(yy)}Q${x} ${n(yy - h * 0.07)} ${n(x - largeur)} ${n(yy)}z`, f);
  };
  return [
    R(n(x - h * 0.035), n(y - h * 0.9), n(h * 0.07), n(h * 0.9), p.brun),
    etage(0.18, l),
    etage(0.36, l * 0.86),
    etage(0.54, l * 0.68),
    etage(0.72, l * 0.48),
    P(`M${n(x - l * 0.26)} ${n(y - h * 0.84)}L${x} ${n(y - h * 1.04)}L${n(x + l * 0.26)} ${n(y - h * 0.84)}z`, f),
  ];
}

/** Feuille en amande entre deux points. */
function feuille2(x1: number, y1: number, x2: number, y2: number, f: string, gonfle = 0.3): Forme {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return P(
    `M${x1} ${y1}Q${n(mx - dy * gonfle)} ${n(my + dx * gonfle)} ${x2} ${y2}Q${n(mx + dy * gonfle)} ${n(my - dx * gonfle)} ${x1} ${y1}z`,
    f,
  );
}

/** Verre à thé. */
const verre = (x: number, y: number): Forme[] => [
  P(`M${x} ${y}h7l-1 10h-5z`, p.blanc, { o: 0.9 }),
  P(`M${x + 0.4} ${y + 4}h6.2l-0.6 6h-5z`, p.orange),
];

// ---------- Perles du collier ----------
const perles: Forme[] = [];
for (let i = 0; i <= 12; i++) {
  const a = ((12 + i * 13) * Math.PI) / 180;
  const taille = 2.4 + 1.5 * Math.sin((i / 12) * Math.PI);
  perles.push(C(n(32 + 20 * Math.cos(a)), n(18 + 26 * Math.sin(a)), n(taille), p.blanc));
  perles.push(C(n(32 + 20 * Math.cos(a) - taille * 0.3), n(18 + 26 * Math.sin(a) - taille * 0.3), n(taille * 0.3), p.roseClair));
}

// ---------- Zellige : pavage d'étoiles ----------
const zellige: Forme[] = [];
for (const cx of [10, 32, 54]) {
  for (const cy of [10, 32, 54]) {
    zellige.push(...etoile8(cx, cy, 9.5, cx === 32 && cy === 32 ? p.accent : p.mer));
    zellige.push(...etoile8(cx, cy, 4.2, p.jauneClair));
  }
}
for (const cx of [21, 43]) {
  for (const cy of [21, 43]) {
    zellige.push(P(`M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}z`, p.vert));
  }
}

// ---------- Les 40 dessins ----------
export const DESSINS: Record<CleAvatar, Dessin> = {
  // ===== Onglet « Hommes » =====
  palmier: {
    fond: p.peche,
    formes: [
      C(32, 40, 15, p.jaune),
      C(32, 40, 10.5, p.jauneClair),
      P('M0 50Q20 42 40 48T64 46V64H0z', p.sable4),
      ...palmier(27, 52, 30, p.brun, p.vertFonce),
    ],
  },
  dunes: {
    fond: p.cielClair,
    formes: [
      C(46, 17, 7, p.jaune),
      P('M0 38Q16 24 32 36T64 30V64H0z', p.sable4),
      P('M0 46Q22 32 40 44T64 42V64H0z', p.sable3),
      P('M0 54Q18 44 36 52T64 50V64H0z', p.sable2),
      T('M8 50Q18 45 28 50', p.sable3, 1.2),
      T('M40 41Q48 37 56 40', p.sable4, 1.2),
    ],
  },
  montagne: {
    fond: p.ciel,
    formes: [
      C(15, 17, 5, p.blanc, { o: 0.9 }),
      P('M0 54L20 26L38 54z', p.merClair),
      P('M14 56L38 14L62 56z', p.nuitClair),
      P('M38 14L29.5 29L34 26.5L37.5 31L41.5 26L47 30z', p.blanc),
      P('M20 26L15.5 32.5L19 31L21.5 34L24.6 32.4z', p.blanc),
      P('M0 54Q32 48 64 54V64H0z', p.blanc),
    ],
  },
  croissant: {
    fond: p.nuit,
    formes: [
      P('M39 12A21 21 0 1 0 52 42A17 17 0 1 1 39 12z', p.jauneClair),
      etincelle(44, 26, 5, p.blanc),
      C(15, 16, 1.3, p.blanc),
      C(52, 14, 1.1, p.blanc),
      C(24, 9, 0.9, p.blanc),
      C(55, 30, 0.9, p.blanc),
      C(10, 30, 0.9, p.blanc),
    ],
  },
  lanterne: {
    fond: p.nuit,
    formes: [
      etincelle(13, 22, 3.4, p.jauneClair),
      etincelle(51, 30, 2.8, p.jauneClair),
      C(49, 15, 1.1, p.blanc),
      C(14, 42, 1.1, p.blanc),
      C(52, 46, 0.9, p.blanc),
      { t: 'c', cx: 32, cy: 9.5, r: 3, s: p.sable3, w: 1.8 },
      P('M23 21L32 12.5L41 21z', p.sable3),
      P('M23 21H41L45 30V42L41 50H23L19 42V30z', p.sable3),
      P('M25.5 24H38.5L41.5 30.5V41.5L38.5 47H25.5L22.5 41.5V30.5z', p.jauneClair),
      P('M32 28Q37 33 35.5 38.5Q34.5 42 32 43Q29.5 42 28.5 38.5Q27 33 32 28z', p.orange),
      T('M32 24V28M22.5 30.5H41.5M22.5 41.5H41.5', p.sable3, 1.4),
      R(25, 50, 14, 3.5, p.sable4, 1),
    ],
  },
  livre: {
    fond: p.vertEau,
    formes: [
      P('M7 23V50Q21 46 32 52Q43 46 57 50V23z', p.accent),
      P('M32 22Q21 15 10 19V45Q21 41 32 48z', p.blanc),
      P('M32 22Q43 15 54 19V45Q43 41 32 48z', p.carte),
      T('M15 25Q22 23 28 26M15 31Q22 29 28 32M15 37Q22 35 28 38', p.sable3, 1.4),
      T('M36 26Q42 23 49 25M36 32Q42 29 49 31M36 38Q42 35 49 37', p.sable3, 1.4),
      T('M32 22V48', p.sable3, 1.2),
      P('M41 17.4L46 17.6V29L43.5 26.5L41 29z', p.vert),
    ],
  },
  calame: {
    fond: p.sable1,
    formes: [
      P('M32 40H54L56 51Q56 56 51 56H35Q30 56 30 51z', p.nuit),
      R(37, 33, 12, 8, p.nuit, 1),
      R(35, 31, 16, 4, p.nuitClair, 2),
      T('M35 46Q37 52 42 52', p.merClair, 1.6),
      T('M11 10L37 36', p.sable4, 5),
      T('M11 10L20 19', p.sable3, 5),
      P('M34.5 38.5L39.5 33.5L45 44z', p.brun),
      T('M12 52Q18 46 22 52T30 50', p.nuit, 1.6),
    ],
  },
  theiere: {
    fond: p.vertEau,
    formes: [
      T('M15 31Q5 31 7 40Q8 46 16 45', p.sable4, 3),
      P('M35 35Q43 34 45 24L48.5 25Q47 39 37 43z', p.sable3),
      P('M12 36Q12 52 25 52Q38 52 38 36Q38 28 25 28Q12 28 12 36z', p.sable3),
      P('M15 36Q15 30 25 29Q17 33 17 40z', p.sable1),
      R(17, 51, 16, 3, p.sable4, 1.5),
      P('M17 29Q25 17 33 29z', p.sable4),
      C(25, 20, 2.3, p.sable4),
      T('M13 38H37', p.sable4, 1.2),
      ...verre(41, 44),
      ...verre(49.5, 44),
      T('M44 40Q42.5 37.5 44.5 35.5M53 40Q51.5 37.5 53.5 35.5', p.sable4, 1.2),
    ],
  },
  olivier: {
    fond: p.cielClair,
    formes: [
      P('M0 54Q32 48 64 54V64H0z', p.sable3),
      P('M27 56Q30 46 25 38L29 36Q31 40 31 33L35 33Q35 40 39 35L42 38Q36 46 38 56z', p.brun),
      C(21, 28, 10, p.vert),
      C(42, 27, 11, p.vert),
      C(32, 19, 11, p.vert),
      C(27, 22, 7, p.vertClair),
      C(41, 23, 6, p.vertClair),
      C(18, 30, 5, p.vertClair),
      ...[[22, 34], [33, 27], [44, 32], [38, 15], [28, 14], [47, 23]].map(([x, y]) => E(x!, y!, 1.6, 2.2, p.nuit)),
    ],
  },
  coupoles: {
    fond: p.peche,
    formes: [
      C(50, 16, 5, p.jauneClair),
      R(6, 42, 16, 22, p.sable1),
      P('M7 42Q7 31 14 30Q21 31 21 42z', p.accent),
      R(42, 44, 16, 20, p.sable1),
      P('M43 44Q43 34 50 33Q57 34 57 44z', p.accent),
      R(19, 38, 26, 26, p.blanc),
      P('M19 38Q18 20 32 16Q46 20 45 38z', p.mer),
      P('M23 34Q23 23 31 19Q26 26 26 36z', p.merClair),
      T('M32 16V9', p.brun, 1.6),
      C(32, 8, 1.8, p.jaune),
      P('M28 64V52Q28 46 32 46Q36 46 36 52V64z', p.brun),
      T('M9 47H19M45 49H55', p.sable3, 1.4),
      R(17, 37, 30, 3, p.sable3),
    ],
  },
  minaret: {
    fond: p.nuitClair,
    formes: [
      C(14, 16, 1.2, p.blanc),
      C(50, 12, 1.2, p.blanc),
      C(52, 30, 1, p.blanc),
      C(10, 34, 1, p.blanc),
      etincelle(18, 26, 3, p.jauneClair),
      R(25, 30, 14, 34, p.sable1),
      R(32, 30, 7, 34, p.sable2),
      R(22, 27, 20, 4, p.sable4, 1),
      R(28, 16, 8, 11, p.sable1),
      R(32, 16, 4, 11, p.sable2),
      R(26, 14, 12, 3, p.sable4, 1),
      P('M27 14Q27 6 32 4Q37 6 37 14z', p.vert),
      T('M32 4V1', p.jaune, 1.4),
      P('M30 26V21Q30 19 32 19Q34 19 34 21V26z', p.brun),
      P('M29.5 44V38Q29.5 35.5 32 35.5Q34.5 35.5 34.5 38V44z', p.brun),
      P('M29 64V56Q29 53 32 53Q35 53 35 56V64z', p.brun),
    ],
  },
  boussole: {
    fond: p.vertEau,
    formes: [
      { t: 'c', cx: 32, cy: 8.5, r: 3, s: p.brun, w: 2 },
      C(32, 34, 22, p.brun),
      C(32, 34, 19, p.sable1),
      C(32, 34, 15.5, p.blanc),
      T('M32 16V20M32 48V52M14 34H18M46 34H50', p.brun, 1.8),
      T('M19.3 21.3L21.4 23.4M44.7 21.3L42.6 23.4M19.3 46.7L21.4 44.6M44.7 46.7L42.6 44.6', p.sable4, 1.2),
      P('M39 22L35 37L29 31z', p.accent),
      P('M25 46L29 31L35 37z', p.nuitClair),
      C(32, 34, 2.2, p.brun),
    ],
  },
  voilier: {
    fond: p.cielClair,
    formes: [
      C(49, 15, 5.5, p.jaune),
      P('M0 45Q8 42 16 45T32 45T48 45T64 45V64H0z', p.mer),
      T('M31 11V43', p.brun, 1.8),
      P('M33 13L49 39H33z', p.blanc),
      P('M29 19L16 39H29z', p.accent),
      P('M12 42H52L46 51H19z', p.brun),
      T('M14 44.5H50', p.sable3, 1.2),
      P('M31 11L37 13.5L31 16z', p.vert),
      T('M6 56Q10 53.5 14 56T22 56M40 57Q44 54.5 48 57T56 57', p.merClair, 1.4),
    ],
  },
  phare: {
    fond: p.ciel,
    formes: [
      P('M32 19L64 6V30z', p.jauneClair, { o: 0.75 }),
      P('M32 19L0 8V28z', p.jauneClair, { o: 0.45 }),
      P('M0 50Q8 47 16 50T32 50T48 50T64 50V64H0z', p.mer),
      P('M14 56Q20 44 32 46Q44 44 50 56Q32 62 14 56z', p.brun),
      P('M26.5 50L28.5 23H35.5L37.5 50z', p.blanc),
      P('M28.1 28H35.9L36.3 34H27.7z', p.accent),
      P('M27.2 40H36.8L37.2 46H26.8z', p.accent),
      R(26.5, 21.5, 11, 2.5, p.brun, 1),
      R(28.5, 15, 7, 6.5, p.jaune),
      T('M32 15V21.5', p.brun, 1),
      P('M27 15L32 9L37 15z', p.brun),
      P('M30.5 50V45.5Q30.5 44 32 44Q33.5 44 33.5 45.5V50z', p.brun),
    ],
  },
  cedres: {
    fond: p.cielClair,
    formes: [
      P('M0 50L18 30L30 44L44 26L64 50V64H0z', p.merClair, { o: 0.55 }),
      P('M0 54Q32 47 64 54V64H0z', p.vertClair),
      ...cedre(44, 54, 26, p.vert),
      ...cedre(25, 57, 40, p.vertFonce),
    ],
  },
  tente: {
    fond: p.peche,
    formes: [
      C(49, 17, 6, p.jauneClair),
      P('M0 44Q16 34 30 42T64 38V64H0z', p.sable3),
      P('M0 52Q32 46 64 52V64H0z', p.sable2),
      T('M23 29L8 53M41 29L56 53', p.brun, 1.2),
      P('M10 53L23 29H41L54 53z', p.sable1),
      P('M23 29H41L44.2 35H19.8z', p.accent),
      P('M16.5 41H47.5L50.8 47H13.2z', p.accent),
      P('M26 53L32 37L38 53z', p.brun),
      T('M23 29V23M41 29V23', p.brun, 1.6),
      P('M41 23L47 25L41 27z', p.vert),
    ],
  },
  oasis: {
    fond: p.cielClair,
    formes: [
      C(50, 15, 6, p.jaune),
      P('M0 42Q18 34 36 40T64 38V64H0z', p.sable2),
      P('M0 50Q30 44 64 50V64H0z', p.sable3),
      E(34, 52, 19, 5.5, p.mer),
      E(31, 51, 9, 2, p.merClair),
      ...palmier(18, 50, 27, p.brun, p.vert),
      ...palmier(43, 47, 18, p.brun, p.vertFonce),
    ],
  },
  porte: {
    fond: p.sable2,
    formes: [
      R(0, 56, 64, 8, p.sable4),
      P('M14 58V30A18 18 0 0 1 50 30V58z', p.blanc),
      P('M18 58V31A14 14 0 0 1 46 31V58z', p.accent),
      P('M21 58V32A11 11 0 0 1 43 32V58z', p.mer),
      T('M32 21V58', p.nuit, 1.3),
      T('M21 34H43', p.nuit, 1.3),
      ...[[25, 39], [29, 39], [35, 39], [39, 39], [25, 46], [39, 46], [25, 53], [29, 53], [35, 53], [39, 53]].map(([x, y]) =>
        C(x!, y!, 1, p.jauneClair),
      ),
      R(29.2, 43.5, 1.4, 5, p.jaune, 0.7),
      R(33.4, 43.5, 1.4, 5, p.jaune, 0.7),
      ...etoile8(32, 27.5, 3.4, p.jauneClair),
    ],
  },
  etoile: {
    fond: p.sable1,
    formes: [
      ...etoile8(32, 32, 26, p.brun),
      ...etoile8(32, 32, 23, p.accent),
      ...etoile8(32, 32, 16.5, p.sable1),
      ...etoile8(32, 32, 13.5, p.mer),
      ...etoile8(32, 32, 7.5, p.jauneClair),
      C(32, 32, 2.6, p.accent),
    ],
  },
  sablier: {
    fond: p.lavandeClair,
    formes: [
      P('M21 15H43Q43 26 35 32Q43 38 43 49H21Q21 38 29 32Q21 26 21 15z', p.blanc),
      P('M24.5 22H39.5Q37.5 27 32 30.6Q26.5 27 24.5 22z', p.jaune),
      P('M23.2 49Q25 42 32 40Q39 42 40.8 49z', p.jaune),
      T('M32 30V41', p.jaune, 1.4),
      { t: 'p', d: 'M21 15H43Q43 26 35 32Q43 38 43 49H21Q21 38 29 32Q21 26 21 15z', s: p.brun, w: 1.6 },
      R(17, 10, 30, 5, p.brun, 2),
      R(17, 49, 30, 5, p.brun, 2),
      T('M20 15V49M44 15V49', p.sable4, 1.6),
    ],
  },

  // ===== Onglet « Femmes » =====
  rose: {
    fond: p.roseClair,
    formes: [
      T('M32 40Q33 50 31 62', p.vert, 2.6),
      feuille2(32, 50, 46, 44, p.vert),
      feuille2(31.5, 55, 18, 50, p.vertClair),
      P('M21 36L32 45L43 36z', p.vert),
      C(32, 25, 16, p.roseFonce),
      C(30, 23, 12.6, p.rose),
      C(33.2, 26.2, 9.6, p.roseFonce),
      C(31, 24.4, 6.6, p.rose),
      T('M28.6 25.4Q30.6 21 34.4 23.4Q37 26.6 33 28.4', p.roseFonce, 1.5),
    ],
  },
  jasmin: {
    fond: p.vert,
    formes: [
      T('M8 50Q28 44 40 26T58 10', p.vertFonce, 2),
      feuille2(20, 47, 9, 36, p.vertClair),
      feuille2(42, 24, 56, 28, p.vertClair),
      feuille2(27, 43, 38, 52, p.vertFonce),
      feuille2(46, 18, 40, 7, p.vertFonce),
      ...fleur(25, 26, 12, p.blanc, p.jaune),
      ...fleur(44, 42, 10.5, p.blanc, p.jaune, 5, 36),
      ...fleur(47, 16, 6, p.blanc, p.jaune, 5, 18),
      ...fleur(16, 50, 5.5, p.blanc, p.jaune, 5, 10),
    ],
  },
  tulipes: {
    fond: p.cielClair,
    formes: [
      P('M0 56Q32 50 64 56V64H0z', p.vertClair),
      ...tulipe(17, 58, 26, p.jaune, p.orange),
      ...tulipe(47, 58, 27, p.rose, p.roseFonce),
      ...tulipe(32, 60, 36, p.rouge, p.accentFonce),
    ],
  },
  branche: {
    fond: p.cielClair,
    formes: [
      T('M4 54Q24 46 38 30T60 12', p.brun, 2.8),
      T('M24 45Q28 34 24 24', p.brun, 2),
      T('M40 28Q50 32 56 40', p.brun, 2),
      feuille2(12, 51, 6, 40, p.vertClair),
      feuille2(52, 18, 62, 22, p.vertClair),
      ...fleur(23, 21, 10, p.rose, p.roseFonce),
      ...fleur(42, 26, 10, p.roseClair, p.roseFonce, 5, 30),
      ...fleur(55, 43, 8, p.rose, p.roseFonce, 5, 12),
      ...fleur(16, 50, 7, p.roseClair, p.roseFonce, 5, 20),
      C(57, 12, 3, p.rose),
      C(33, 38, 2.6, p.roseFonce),
    ],
  },
  lavande: {
    fond: p.lavandeClair,
    formes: [
      T('M32 62V22', p.vert, 2),
      T('M30 62Q24 44 17 28', p.vert, 2),
      T('M34 62Q40 44 47 28', p.vert, 2),
      feuille2(31, 58, 22, 52, p.vertClair, 0.2),
      feuille2(33, 58, 42, 52, p.vertClair, 0.2),
      ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
        E(29.6 + (i % 2) * 4.8, 31 - i * 4.2, 3.3 - i * 0.22, 2.9, i % 2 ? p.lavande : p.nuitClair, [(i % 2 ? 25 : -25), 32, 31 - i * 4.2]),
      ]),
      E(32, 7.5, 2.3, 3.2, p.lavande),
      ...[0, 1, 2, 3, 4].flatMap((i) => [
        E(17.8 - i * 1.75 + (i % 2 ? 2.4 : -2.4), 31 - i * 4, 3 - i * 0.2, 2.7, i % 2 ? p.nuitClair : p.lavande, [-22, 17.8 - i * 1.75, 31 - i * 4]),
      ]),
      E(9.6, 12, 2.1, 3, p.lavande, [-22, 9.6, 12]),
      ...[0, 1, 2, 3, 4].flatMap((i) => [
        E(46.2 + i * 1.75 + (i % 2 ? -2.4 : 2.4), 31 - i * 4, 3 - i * 0.2, 2.7, i % 2 ? p.nuitClair : p.lavande, [22, 46.2 + i * 1.75, 31 - i * 4]),
      ]),
      E(54.4, 12, 2.1, 3, p.lavande, [22, 54.4, 12]),
    ],
  },
  bouquet: {
    fond: p.peche,
    formes: [
      feuille2(20, 30, 8, 22, p.vert),
      feuille2(44, 30, 56, 22, p.vert),
      feuille2(30, 14, 26, 3, p.vertClair),
      P('M17 33L32 61L47 33z', p.blanc),
      P('M32 61L47 33H33z', p.sable1),
      ...fleur(21, 27, 10, p.rose, p.jauneClair, 6),
      ...fleur(43, 27, 10, p.lavande, p.jauneClair, 6, 30),
      ...fleur(32, 17, 10.5, p.rouge, p.jauneClair, 6, 15),
      ...fleur(32, 33, 8, p.jaune, p.orange, 6),
      P('M24.5 47H39.5L37.4 51H26.6z', p.accent),
      P('M32 49L24 56L27 50zM32 49L40 56L37 50z', p.accent),
    ],
  },
  grenade: {
    fond: p.vertEau,
    formes: [
      feuille2(36, 17, 52, 10, p.vert),
      T('M33 20Q36 14 42 12', p.brun, 1.8),
      P('M25.5 22L26 12.5L30 17L32 11.5L34 17L38 12.5L38.5 22z', p.accentFonce),
      C(32, 38, 18, p.rouge),
      P('M17 35Q18 24 28 21.5Q21 27 20.5 37z', p.rose, { o: 0.8 }),
      // Quartier ouvert : on voit les grains
      P('M32 38L47 30A17 17 0 0 1 43 51z', p.roseClair),
      ...[[40, 36], [44, 35], [41, 40.5], [45, 40], [40, 45], [43.5, 45]].map(([x, y]) => E(x!, y!, 1.7, 2.1, p.rouge)),
    ],
  },
  citronnier: {
    fond: p.cielClair,
    formes: [
      P('M22 46H42L39 60H25z', p.accent),
      R(20, 43, 24, 5, p.accentFonce, 1.5),
      T('M32 43V28', p.brun, 3),
      C(22, 22, 11, p.vert),
      C(42, 22, 11, p.vert),
      C(32, 14, 11, p.vert),
      C(32, 26, 10, p.vert),
      C(26, 15, 6, p.vertClair),
      C(42, 20, 5, p.vertClair),
      E(21, 26, 3.6, 4.6, p.jaune, [-20, 21, 26]),
      E(36, 12, 3.6, 4.6, p.jaune, [20, 36, 12]),
      E(44, 28, 3.6, 4.6, p.jaune, [15, 44, 28]),
      E(31, 28, 3.4, 4.4, p.jaune, [-10, 31, 28]),
    ],
  },
  plante: {
    fond: p.sable1,
    formes: [
      feuille2(32, 44, 10, 26, p.vert, 0.34),
      feuille2(32, 44, 54, 26, p.vert, 0.34),
      feuille2(32, 44, 20, 9, p.vertClair, 0.3),
      feuille2(32, 44, 44, 9, p.vertClair, 0.3),
      feuille2(32, 46, 32, 5, p.vertFonce, 0.24),
      T('M32 44V10', p.vert, 1),
      P('M21 46H43L40 60H24z', p.accent),
      R(19, 42, 26, 6, p.accentFonce, 2),
      T('M23.5 52H40.5', p.peche, 1.4),
    ],
  },
  cactus: {
    fond: p.jauneClair,
    formes: [
      T('M26 36H17.5V27', p.vert, 7),
      T('M38 31H46.5V23', p.vert, 7),
      R(24, 13, 16, 36, p.vert, 8),
      T('M29 17V46M35 17V46', p.vertFonce, 1.2),
      T('M17.5 28V35M46.5 24V30', p.vertFonce, 1.1),
      ...fleur(32, 12, 7, p.rose, p.jaune, 6),
      ...fleur(46.5, 20, 4.4, p.roseFonce, p.jauneClair, 5),
      P('M21 47H43L40 60H24z', p.accent),
      R(19, 44, 26, 5.5, p.accentFonce, 2),
    ],
  },
  lune: {
    fond: p.nuitClair,
    formes: [
      C(13, 14, 1.2, p.blanc),
      C(53, 20, 1.2, p.blanc),
      C(24, 8, 0.9, p.blanc),
      etincelle(50, 10, 3.2, p.jauneClair),
      etincelle(11, 30, 2.6, p.jauneClair),
      C(33, 27, 16, p.jauneClair),
      // Cratères groupés d'un seul côté : ils ne doivent jamais évoquer un visage.
      C(40, 23, 4.2, p.jaune, { o: 0.5 }),
      C(44.5, 30, 1.8, p.jaune, { o: 0.5 }),
      C(35, 16.5, 1.4, p.jaune, { o: 0.5 }),
      ...nuage(8, 48, 1.5, p.lavandeClair),
      ...nuage(30, 55, 1.9, p.blanc),
    ],
  },
  arcenciel: {
    fond: p.cielClair,
    formes: [
      T('M9 46A23 23 0 0 1 55 46', p.rouge, 4.4),
      T('M13.4 46A18.6 18.6 0 0 1 50.6 46', p.jaune, 4.4),
      T('M17.8 46A14.2 14.2 0 0 1 46.2 46', p.vertClair, 4.4),
      T('M22.2 46A9.8 9.8 0 0 1 41.8 46', p.mer, 4.4),
      T('M26.6 46A5.4 5.4 0 0 1 37.4 46', p.lavande, 4.4),
      ...nuage(1, 52, 1.5, p.blanc),
      ...nuage(41, 52, 1.5, p.blanc),
      C(50, 13, 5, p.jaune),
    ],
  },
  panier: {
    fond: p.vertEau,
    formes: [
      { t: 'p', d: 'M15 37Q32 4 49 37', s: p.sable4, w: 2.6 },
      feuille2(30, 18, 40, 13, p.vert),
      C(22, 31, 7.5, p.rouge),
      C(42, 31, 7.5, p.orange),
      E(32, 27, 6.4, 8.4, p.jaune),
      T('M32 19Q32.6 16 35 15', p.brun, 1.6),
      ...[[25, 37], [29.5, 37], [34, 37], [38.5, 37], [27.2, 33.4], [31.8, 33.4], [36.4, 33.4]].map(([x, y]) => C(x!, y!, 2.7, p.lavande)),
      P('M11 38H53L48 57H16z', p.sable3),
      T('M13 43.5H51M14.4 49H49.6M22 39L24.5 56.5M32 39V56.5M42 39L39.5 56.5', p.sable4, 1.3),
      R(9.5, 35.5, 45, 4.5, p.sable4, 2.2),
    ],
  },
  fraises: {
    fond: p.roseClair,
    formes: [
      feuille2(40, 16, 56, 12, p.vertClair),
      T('M24 24Q32 8 44 22', p.vert, 1.8),
      ...fraise(22, 36, 1.25),
      ...fraise(44, 35, 1.05),
      ...fleur(51, 52, 5.5, p.blanc, p.jaune),
    ],
  },
  zellige: {
    fond: p.blanc,
    formes: zellige,
  },
  mer: {
    fond: p.peche,
    formes: [
      R(0, 0, 64, 18, p.rose, 0, { o: 0.45 }),
      C(32, 37, 13, p.orange),
      C(32, 37, 9, p.jaune),
      ...nuage(4, 23, 1.2, p.roseClair),
      ...nuage(40, 18, 1.1, p.roseClair),
      R(0, 37, 64, 27, p.mer),
      R(0, 37, 64, 5, p.merClair),
      T('M24 45H40M27 50H37M21 55H43', p.jauneClair, 2),
      T('M6 47H16M48 52H58M8 57H14', p.merClair, 1.4),
    ],
  },
  vase: {
    fond: p.lavandeClair,
    formes: [
      T('M32 36V16M30 36Q26 28 20 22M34 36Q38 28 44 22', p.vert, 1.8),
      feuille2(31, 32, 22, 31, p.vertClair),
      feuille2(33, 32, 42, 31, p.vertClair),
      ...fleur(32, 13, 8.5, p.rose, p.jaune, 6),
      ...fleur(18.5, 20, 7.5, p.jaune, p.orange, 6, 20),
      ...fleur(45.5, 20, 7.5, p.roseFonce, p.jauneClair, 6, 10),
      P('M26 34H38V38Q46 44 43 53Q41 59 36 60H28Q23 59 21 53Q18 44 26 38z', p.mer),
      R(24.5, 32.5, 15, 3.5, p.nuitClair, 1.6),
      T('M21.4 46H42.6', p.blanc, 1.5),
      T('M21.2 51Q23 49 24.8 51T28.4 51T32 51T35.6 51T39.2 51T42.8 51', p.jauneClair, 1.3),
      R(27, 59, 10, 2.5, p.nuitClair, 1),
    ],
  },
  tasse: {
    fond: p.sable1,
    formes: [
      T('M24 21Q21 17 24 13T24 6M33 21Q30 17 33 13T33 6', p.sable3, 1.8),
      E(30, 51, 23, 5, p.blanc),
      E(30, 50.4, 14, 2.6, p.sable2),
      { t: 'p', d: 'M43 30Q54 29 53 37Q52 44 41 44', s: p.blanc, w: 3.6 },
      P('M13 26H45V36Q45 50 29 50Q13 50 13 36z', p.blanc),
      P('M13 31H45V36H13z', p.accent),
      E(29, 26, 16, 3.4, p.carte),
      E(29, 26.4, 13, 2.3, p.sable4),
      ...fleur(51, 51, 6, p.rose, p.jaune),
      feuille2(46, 55, 39, 58, p.vert),
    ],
  },
  collier: {
    fond: p.lavande,
    formes: [
      T('M12.4 22.4Q14 46 32 44.5Q50 46 51.6 22.4', p.lavandeClair, 1, { o: 0.7 }),
      ...perles,
      P('M32 47.5Q37.5 54 32 59Q26.5 54 32 47.5z', p.jauneClair),
      P('M32 50Q34.5 53.5 32 56.5Q29.5 53.5 32 50z', p.jaune),
    ],
  },
  plume: {
    fond: p.cielClair,
    formes: [
      T('M10 56Q16 51 21 56T31 54', p.nuit, 1.5),
      P('M50 8Q30 8 21 26Q16 36 17 46Q32 44 42 30Q50 20 50 8z', p.nuitClair),
      P('M50 8Q34 12 26 28Q21 38 17 46Q32 44 42 30Q50 20 50 8z', p.mer),
      T('M48 10Q30 26 13 53', p.blanc, 1.5),
      T('M26 23L31 29M22 31L26.5 36M38 14L39.5 20M40 30L33 28M34 38L28 36M45 20L39.5 20', p.cielClair, 1.1),
      P('M15.6 48.4L11.5 55.5L18.5 51.2z', p.brun),
    ],
  },
};
