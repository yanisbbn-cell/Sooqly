import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { Texte } from './Texte';

export type Illustration = 'couffin' | 'coeur' | 'bulle' | 'cloche' | 'loupe' | 'cle' | 'enveloppe' | 'etoile' | 'cadenas';

/**
 * Écran vide (aucun favori, aucun message, aucune annonce…) : une illustration d'objet dans les couleurs de Sooqly,
 * un texte, et éventuellement un bouton. Aucun être animé.
 */
export function EtatVide({ illustration, texte, children }: { illustration: Illustration; texte: string; children?: ReactNode }) {
  return (
    <View style={styles.bloc}>
      <Dessin nom={illustration} />
      <Texte style={styles.texte}>{texte}</Texte>
      {children}
    </View>
  );
}

const S = {
  fond: colors.sable1,
  clair: colors.sable2,
  moyen: colors.sable3,
  fonce: colors.sable4,
  brun: colors.brun,
  accent: colors.accent,
  ocre: '#E2A54E',
  olive: '#8C8A55',
};

function Dessin({ nom }: { nom: Illustration }) {
  return (
    <Svg width={132} height={132} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={60} cy={60} r={56} fill={S.fond} />
      <Ellipse cx={60} cy={99} rx={30} ry={4} fill={S.brun} opacity={0.1} />
      {FORMES[nom]}
    </Svg>
  );
}

const FORMES: Record<Illustration, ReactNode> = {
  // Couffin du marché, avec une orange et une grenade.
  couffin: (
    <G>
      <Path d="M37 57Q60 14 83 57" stroke={S.fonce} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Circle cx={50} cy={52} r={9} fill={S.ocre} />
      <Circle cx={68} cy={50} r={8.5} fill={S.accent} />
      <Path d="M68 41.5l-2-3h4z" fill={S.accent} />
      <Path d="M51 43q4-5 8-2-4 3-8 2z" fill={S.olive} />
      <Rect x={26} y={55} width={68} height={8} rx={4} fill={S.fonce} />
      <Path d="M30 63H90L83 92Q82 96 78 96H42Q38 96 37 92Z" fill={S.moyen} />
      <G stroke={S.fonce} strokeWidth={1.6} opacity={0.6}>
        <Path d="M33 72H87M35 81H85M37 89H83" />
        <Path d="M45 63V96M60 63V96M75 63V96" />
      </G>
    </G>
  ),
  // Étiquette de prix avec un cœur.
  coeur: (
    <G>
      <Path d="M44 22Q50 30 52 36" stroke={S.fonce} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M36 40Q36 34 42 34H78L94 60L78 86H42Q36 86 36 80Z" fill={S.clair} />
      <Path d="M36 40Q36 34 42 34H78L94 60L78 86H42Q36 86 36 80Z" fill="none" stroke={S.fonce} strokeWidth={2} />
      <Circle cx={82} cy={60} r={4} fill={S.fond} stroke={S.fonce} strokeWidth={2} />
      <Path d="M58 74C46 66 44 58 48 53c3-4 8-3 10 1 2-4 7-5 10-1 4 5 2 13-10 21z" fill={S.accent} />
    </G>
  ),
  // Deux bulles de discussion.
  bulle: (
    <G>
      <Path d="M24 36Q24 28 32 28H66Q74 28 74 36V56Q74 64 66 64H44L33 73V64H32Q24 64 24 56Z" fill={S.clair} />
      <Path d="M46 52Q46 44 54 44H88Q96 44 96 52V72Q96 80 88 80H87V89L76 80H54Q46 80 46 72Z" fill={S.brun} />
      <Circle cx={60} cy={62} r={3} fill={S.fond} />
      <Circle cx={71} cy={62} r={3} fill={S.fond} />
      <Circle cx={82} cy={62} r={3} fill={S.fond} />
    </G>
  ),
  // Cloche d'alerte.
  cloche: (
    <G>
      <Circle cx={60} cy={27} r={4} fill={S.fonce} />
      <Path d="M60 30C44 30 38 42 38 56V70L31 80H89L82 70V56C82 42 76 30 60 30Z" fill={S.ocre} />
      <Path d="M48 40Q44 46 44 56" stroke={S.fond} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M51 84Q52 93 60 93Q68 93 69 84Z" fill={S.fonce} />
      <Path d="M92 36q5 6 2 14M28 36q-5 6-2 14" stroke={S.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  ),
  // Loupe au-dessus d'un motif géométrique.
  loupe: (
    <G>
      <Path d="M44 66l3.2 7.8L55 77l-7.8 3.2L44 88l-3.2-7.8L33 77l7.8-3.2z" fill={S.moyen} />
      <Path d="M76 30l2.4 5.6L84 38l-5.6 2.4L76 46l-2.4-5.6L68 38l5.6-2.4z" fill={S.moyen} />
      <Path d="M72 70L90 88" stroke={S.brun} strokeWidth={9} strokeLinecap="round" />
      <Circle cx={56} cy={54} r={22} fill={S.fond} stroke={S.fonce} strokeWidth={7} />
      <Path d="M44 46Q48 38 56 37" stroke={S.moyen} strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  ),
  // Clé (location).
  cle: (
    <G>
      <Circle cx={42} cy={54} r={18} fill={S.ocre} />
      <Circle cx={42} cy={54} r={7} fill={S.fond} />
      <Path d="M58 54H94V62H88V70H80V62H72V68H64V62H58Z" fill={S.ocre} />
      <Path d="M30 44Q34 38 40 37" stroke={S.fond} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      <Rect x={36} y={78} width={22} height={12} rx={3} fill={S.accent} />
      <Path d="M47 78V71" stroke={S.fonce} strokeWidth={2} />
    </G>
  ),
  // Enveloppe (documents reçus).
  enveloppe: (
    <G>
      <Rect x={26} y={36} width={68} height={48} rx={6} fill={S.clair} />
      <Path d="M28 40L60 64L92 40" stroke={S.fonce} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <Path d="M28 82L50 62M92 82L70 62" stroke={S.moyen} strokeWidth={2} />
      <Circle cx={60} cy={66} r={7} fill={S.accent} />
    </G>
  ),
  // Étoile (transactions à noter).
  etoile: (
    <G>
      <Path d="M60 24l10.6 21.5 23.7 3.4-17.1 16.7 4 23.6L60 78l-21.2 11.2 4-23.6-17.1-16.7 23.7-3.4z" fill={S.ocre} />
      <Path d="M60 34l6 12" stroke={S.fond} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </G>
  ),
  // Cadenas (membres bloqués).
  cadenas: (
    <G>
      <Path d="M44 54V44Q44 28 60 28Q76 28 76 44V54" stroke={S.fonce} strokeWidth={7} fill="none" />
      <Rect x={34} y={52} width={52} height={40} rx={8} fill={S.ocre} />
      <Circle cx={60} cy={68} r={5} fill={S.brun} />
      <Path d="M60 70V80" stroke={S.brun} strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
};

const styles = StyleSheet.create({
  bloc: { alignItems: 'center', gap: 14, paddingTop: 36, paddingHorizontal: 28, paddingBottom: 24 },
  texte: { fontSize: 14, lineHeight: 21, color: colors.brunMoyen, textAlign: 'center', maxWidth: 360 },
});
