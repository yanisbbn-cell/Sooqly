import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Icônes des catégories (traits repris de la maquette), en 24 × 24. */
const DESSINS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.5} />
      <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.5} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.5} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} />
    </>
  ),
  building: (
    <>
      <Path d="M4 21V5l8-3 8 3v16" />
      <Path d="M9 21v-5h6v5" />
      <Path d="M8 8h2M14 8h2M8 12h2M14 12h2" />
    </>
  ),
  car: (
    <>
      <Path d="M5 17H3v-4l2-5h14l2 5v4h-2" />
      <Circle cx={7.5} cy={17} r={2} />
      <Circle cx={16.5} cy={17} r={2} />
      <Path d="M9.5 17h5M4 13h16" />
    </>
  ),
  wheel: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </>
  ),
  fridge: (
    <>
      <Rect x={6} y={2} width={12} height={20} rx={2} />
      <Path d="M6 9h12M9 5v2M9 12v3" />
    </>
  ),
  sofa: (
    <>
      <Path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <Path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z" />
      <Path d="M5 18v2M19 18v2" />
    </>
  ),
  laptop: (
    <>
      <Rect x={5} y={4} width={14} height={10} rx={1.5} />
      <Path d="M2 18h20l-2-4H4z" />
    </>
  ),
  garment: <Path d="M9 3l3 2 3-2 5 3-2 4-2-1v12H8V9l-2 1-2-4z" />,
  // Poussette (capote, nacelle, poignée, roues) : un objet, jamais un enfant dessiné.
  stroller: (
    <>
      <Path d="M4 11a7 7 0 0 1 7-7v7" />
      <Path d="M4 11h14a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <Path d="M18 11l2-6h1.5" />
      <Circle cx={8} cy={19} r={2} />
      <Circle cx={15} cy={19} r={2} />
    </>
  ),
  tool: <Path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  gift: (
    <>
      <Rect x={3} y={9} width={18} height={12} rx={1.5} />
      <Path d="M3 13h18M12 9v12" />
      <Path d="M12 9c-1.5-3.5-6-3.5-6-1.2S9 9 12 9zM12 9c1.5-3.5 6-3.5 6-1.2S15 9 12 9z" />
    </>
  ),
};

export function IconeCategorie({ icone, couleur, taille = 26 }: { icone: string; couleur: string; taille?: number }) {
  return (
    <Svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke={couleur}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {DESSINS[icone] ?? DESSINS.grid}
    </Svg>
  );
}
