import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect, Text as TexteSvg } from 'react-native-svg';

import { avatarParNumero } from '@/lib/avatars';
import { colors, fonts } from '@/theme';

import { DESSINS, type Forme } from './avatars/dessins';

type Props = {
  /** Numéro de l'image de profil (1 à 40). Vide ou inconnu : rond d'accent avec « ? ». */
  numero: number | null | undefined;
  taille?: number;
};

/** Image de profil ronde : une des 40 illustrations sans visage (jamais de photo). */
export function ImageProfil({ numero, taille = 64 }: Props) {
  const id = useId();
  const avatar = avatarParNumero(numero);

  if (!avatar) {
    return (
      <Svg width={taille} height={taille} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={32} fill={colors.accent} />
        <TexteSvg x={32} y={43} fontSize={30} fontFamily={fonts.titre[700]} fontWeight="700" fill={colors.blanc} textAnchor="middle">
          ?
        </TexteSvg>
      </Svg>
    );
  }

  const dessin = DESSINS[avatar.cle];
  return (
    <Svg width={taille} height={taille} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={id}>
          <Circle cx={32} cy={32} r={32} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={0} width={64} height={64} fill={dessin.fond} />
        {dessin.formes.map((f, i) => (
          <FormeSvg key={i} forme={f} />
        ))}
      </G>
    </Svg>
  );
}

function FormeSvg({ forme: f }: { forme: Forme }) {
  const style = {
    fill: f.f ?? 'none',
    stroke: f.s,
    strokeWidth: f.s ? (f.w ?? 2) : undefined,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: f.o,
  };
  switch (f.t) {
    case 'p':
      return <Path d={f.d} {...style} />;
    case 'c':
      return <Circle cx={f.cx} cy={f.cy} r={f.r} {...style} />;
    case 'r':
      return <Rect x={f.x} y={f.y} width={f.l} height={f.h} rx={f.rx} {...style} />;
    case 'e':
      return (
        <Ellipse
          cx={f.cx}
          cy={f.cy}
          rx={f.rx}
          ry={f.ry}
          transform={f.rot ? `rotate(${f.rot[0]} ${f.rot[1]} ${f.rot[2]})` : undefined}
          {...style}
        />
      );
  }
}
