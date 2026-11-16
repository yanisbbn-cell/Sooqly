import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as TexteSvg } from 'react-native-svg';

import { avatarParNumero } from '@/lib/avatars';
import { colors, fonts } from '@/theme';

import { DESSINS, type Degrade, type Dessin, type Forme } from './avatars/dessins';

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

  return <DessinSvg dessin={DESSINS[avatar.cle]} taille={taille} id={id} />;
}

/** Dessine une illustration (64 × 64) dans un rond, avec ses dégradés. */
export function DessinSvg({ dessin, taille, id }: { dessin: Dessin; taille: number; id: string }) {
  const sid = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const degrades: { cle: string; d: Degrade }[] = [];
  const remplir = (f: string | Degrade | undefined, cle: string) => {
    if (!f || typeof f === 'string') return f ?? 'none';
    degrades.push({ cle, d: f });
    return `url(#${cle})`;
  };
  const fond = remplir(dessin.fond, `${sid}-fond`);
  const formes = dessin.formes.map((f, i) => ({ f, fill: remplir(f.f, `${sid}-${i}`) }));
  return (
    <Svg width={taille} height={taille} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={`${sid}-rond`}>
          <Circle cx={32} cy={32} r={32} />
        </ClipPath>
        {degrades.map(({ cle, d }) => (
          <LinearGradient key={cle} id={cle} x1="0" y1="0" x2={d.sens === 'v' || !d.sens ? '0' : '1'} y2={d.sens === 'h' ? '0' : '1'}>
            <Stop offset="0" stopColor={d.de} />
            <Stop offset="1" stopColor={d.a} />
          </LinearGradient>
        ))}
      </Defs>
      <G clipPath={`url(#${sid}-rond)`}>
        <Rect x={0} y={0} width={64} height={64} fill={fond} />
        {formes.map(({ f, fill }, i) => (
          <FormeSvg key={i} forme={f} fill={fill} />
        ))}
      </G>
    </Svg>
  );
}

function FormeSvg({ forme: f, fill }: { forme: Forme; fill: string }) {
  const style = {
    fill,
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
