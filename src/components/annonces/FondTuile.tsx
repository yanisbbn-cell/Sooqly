import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Fond « en relief » d'une tuile de catégorie : dégradé de la couleur, reflet en haut, ombre intérieure en bas.
 * Se place en arrière-plan (position absolue) d'une vue carrée aux coins arrondis.
 */
export function FondTuile({ de, a, taille, rayon, id }: { de: string; a: string; taille: number; rayon: number; id: string }) {
  const g = `tuile-${id}`;
  return (
    <Svg width={taille} height={taille} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${g}-fond`} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={de} />
          <Stop offset="1" stopColor={a} />
        </LinearGradient>
        <LinearGradient id={`${g}-reflet`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.24} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${g}-ombre`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={taille} height={taille} rx={rayon} fill={`url(#${g}-fond)`} />
      <Rect x={0} y={taille * 0.62} width={taille} height={taille * 0.38} rx={rayon} fill={`url(#${g}-ombre)`} />
      <Ellipse cx={taille * 0.5} cy={taille * 0.08} rx={taille * 0.62} ry={taille * 0.3} fill={`url(#${g}-reflet)`} />
      <Rect x={0.75} y={0.75} width={taille - 1.5} height={taille - 1.5} rx={rayon - 0.75} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.5} />
    </Svg>
  );
}
