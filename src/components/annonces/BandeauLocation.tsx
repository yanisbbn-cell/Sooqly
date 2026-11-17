import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

/** Entrée « Rechercher une location » de l'accueil : carte foncée, illustration immeuble + voiture, bouton d'action. */
export function BandeauLocation() {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const { width } = useWindowDimensions();
  const petit = width < 520;
  return (
    <Pressable
      onPress={() => router.push('/location')}
      accessibilityRole="button"
      accessibilityLabel={`${t('location.recherche')}. ${t('location.rechercheSous')}`}
      style={({ pressed }) => [styles.carte, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.texte}>
        <Texte variante="titre" poids={700} style={styles.titre}>
          {t('location.recherche')}
        </Texte>
        <Texte style={styles.sous}>{t('location.rechercheSous')}</Texte>
        <View style={styles.bouton}>
          <Texte poids={700} style={styles.boutonTexte}>
            {`${t('location.voir')}\u00A0${rtl ? '‹' : '›'}`}
          </Texte>
        </View>
      </View>
      <View style={rtl ? { transform: [{ scaleX: -1 }] } : undefined}>
        <IllustrationLocation largeur={petit ? 112 : 150} />
      </View>
    </Pressable>
  );
}

/** Immeuble aux fenêtres éclairées et voiture garée devant (aucun être animé). */
function IllustrationLocation({ largeur }: { largeur: number }) {
  const allumees = new Set(['0-1', '1-0', '1-2', '2-1', '3-0', '3-2', '4-1']);
  const fenetres = [];
  for (let l = 0; l < 5; l++) {
    for (let c = 0; c < 3; c++) {
      fenetres.push(
        <Rect
          key={`${l}-${c}`}
          x={58 + c * 13}
          y={22 + l * 13}
          width={8}
          height={8}
          rx={1.5}
          fill={allumees.has(`${l}-${c}`) ? '#F2C77A' : colors.sable4}
        />,
      );
    }
  }
  return (
    <Svg width={largeur} height={(largeur * 112) / 150} viewBox="0 0 150 112">
      {/* halo du soleil */}
      <Circle cx={118} cy={26} r={18} fill={colors.accent} opacity={0.35} />
      <Circle cx={118} cy={26} r={10} fill={colors.accent} opacity={0.8} />
      {/* immeuble du fond */}
      <Rect x={24} y={40} width={30} height={62} rx={3} fill={colors.sable4} />
      <G fill={colors.brun} opacity={0.35}>
        <Rect x={30} y={48} width={6} height={6} rx={1} />
        <Rect x={42} y={48} width={6} height={6} rx={1} />
        <Rect x={30} y={60} width={6} height={6} rx={1} />
        <Rect x={42} y={60} width={6} height={6} rx={1} />
        <Rect x={30} y={72} width={6} height={6} rx={1} />
        <Rect x={42} y={72} width={6} height={6} rx={1} />
      </G>
      {/* immeuble principal */}
      <Rect x={50} y={12} width={50} height={90} rx={4} fill={colors.sable2} />
      <Rect x={50} y={12} width={50} height={5} rx={2} fill={colors.sable3} />
      {fenetres}
      <Rect x={68} y={88} width={14} height={14} rx={2} fill={colors.sable4} />
      {/* sol */}
      <Rect x={0} y={101} width={150} height={3} rx={1.5} fill={colors.sable4} opacity={0.6} />
      {/* voiture */}
      <Path
        d="M84 98c0-6 4-8.5 10-9.5l9-7c3.5-2.5 9-3 14.5-3 6 0 10 1 13 3.5l7 6c5 .8 8 3 8 7.5v2.5H84Z"
        fill={colors.accent}
      />
      <Path d="M101 88.5l6-5c2.5-1.8 6-2.2 10-2.2 4.5 0 7.5.7 9.5 2.2l5.5 5Z" fill={colors.brun} opacity={0.85} />
      <Rect x={116.5} y={81} width={2} height={8} fill={colors.accent} />
      <Rect x={140} y={92} width={4} height={2.5} rx={1.2} fill="#F2C77A" />
      <Circle cx={96} cy={100} r={6.5} fill={colors.brunNuit} />
      <Circle cx={96} cy={100} r={2.6} fill={colors.sable3} />
      <Circle cx={133} cy={100} r={6.5} fill={colors.brunNuit} />
      <Circle cx={133} cy={100} r={2.6} fill={colors.sable3} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  carte: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.brun,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    overflow: 'hidden',
  },
  texte: { flex: 1, gap: 6, alignSelf: 'center' },
  titre: { fontSize: 18, lineHeight: 24, color: colors.sable1 },
  sous: { fontSize: 13, lineHeight: 18, color: colors.sable3 },
  bouton: {
    alignSelf: 'flex-start',
    minHeight: toucheMin,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  boutonTexte: { fontSize: 14, color: colors.blanc },
});
