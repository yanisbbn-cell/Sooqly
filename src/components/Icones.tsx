import Svg, { Circle, Path } from 'react-native-svg';

type P = { couleur: string; taille?: number; epaisseur?: number };

const base = (taille: number) => ({ width: taille, height: taille, viewBox: '0 0 24 24', fill: 'none' as const });

export function IconeAccueil({ couleur, taille = 22 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" />
    </Svg>
  );
}

export function IconeMessage({ couleur, taille = 22 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </Svg>
  );
}

export function IconeFavori({ couleur, taille = 22 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-6-4-6 4z" />
    </Svg>
  );
}

export function IconeCompte({ couleur, taille = 22 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Svg>
  );
}

export function IconePlus({ couleur, taille = 20 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2.8} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconeGlobe({ couleur, taille = 18 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </Svg>
  );
}

export function IconeCoche({ couleur, taille = 12, epaisseur = 3.4 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12l5 5 9-10" />
    </Svg>
  );
}

export function IconeRetour({ couleur, taille = 22 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function IconeChevronBas({ couleur, taille = 18 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconeLoupe({ couleur, taille = 20 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function IconeFiltres({ couleur, taille = 20 }: P) {
  return (
    <Svg {...base(taille)} stroke={couleur} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <Circle cx={16} cy={6} r={2} />
      <Circle cx={10} cy={12} r={2} />
      <Circle cx={18} cy={18} r={2} />
    </Svg>
  );
}
