import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconeRetour } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

const FENETRES = [
  [104, 66], [116, 66], [104, 80], [158, 50], [170, 50], [158, 64], [170, 64], [348, 72], [360, 72],
] as const;

/**
 * Bannière de la page Pro (vitrine) : la photo choisie par le professionnel, sinon la ville stylisée
 * et le soleil couleur d'accent de la maquette (répétée sur la largeur : jamais agrandie ni coupée).
 */
export function BanniereVitrine({ image, apercu }: { image?: string | null; apercu?: boolean }) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const zone = useSafeAreaInsets();
  // En aperçu (choix de la bannière) : ni marge du haut de l'écran, ni boutons.
  const insets = apercu ? { top: 0 } : zone;
  const { width } = useWindowDimensions();
  const hauteur = (image ? Math.min(260, Math.max(170, width * 0.36)) : 150) + insets.top;
  const motifs = Math.max(1, Math.round(width / 390));
  return (
    <View style={[styles.banniere, { height: hauteur }]}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Svg width="100%" height="100%" viewBox={`0 0 ${390 * motifs} 150`} preserveAspectRatio="xMidYMax slice" style={StyleSheet.absoluteFill}>
          <Circle cx={390 * motifs - 90} cy={58} r={26} fill={colors.accent} opacity={0.9} />
          {Array.from({ length: motifs }, (_, i) => (
            <G key={i} transform={`translate(${i * 390} 0)`}>
              <Path
                d="M0 150 V96 H34 V70 H70 V104 H96 V58 H128 V90 H150 V40 H186 V84 H212 V66 H246 V100 H276 V76 H312 V110 H340 V62 H372 V92 H390 V150z"
                fill="#4A3A2D"
              />
              <Path d="M0 150 V118 H48 V100 H84 V124 H120 V106 H164 V120 H204 V98 H240 V122 H286 V108 H330 V126 H390 V150z" fill="#5A4636" />
              <G fill={colors.sable3} opacity={0.55}>
                {FENETRES.map(([x, y]) => (
                  <Rect key={`${x}-${y}`} x={x} y={y} width={6} height={8} />
                ))}
              </G>
            </G>
          ))}
        </Svg>
      )}
      {!apercu && (
      <View style={[styles.haut, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('commun.retour')}
          style={styles.retour}
        >
          <View style={rtl && { transform: [{ scaleX: -1 }] }}>
            <IconeRetour couleur={colors.sable1} />
          </View>
        </Pressable>
        <View style={styles.etiquette}>
          <Texte poids={700} style={{ fontSize: 12, color: colors.sable1 }}>
            {t('vitrine.page')}
          </Texte>
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banniere: { backgroundColor: colors.brun, overflow: 'hidden' },
  haut: { position: 'absolute', start: 12, end: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retour: {
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    backgroundColor: 'rgba(42,32,24,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquette: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(42,32,24,0.6)' },
});
