import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

/**
 * Pendant le chargement : des cartes « fantômes » à la forme des vraies annonces, qui respirent doucement
 * (au lieu d'une roue qui tourne). Grille de « rangees » rangées de « colonnes » cartes.
 */
export function GrilleFantome({ colonnes, largeur, rangees = 2 }: { colonnes: number; largeur: number; rangees?: number }) {
  const { t } = useTranslation();
  const lueur = useSharedValue(0.55);
  useEffect(() => {
    lueur.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [lueur]);
  const anime = useAnimatedStyle(() => ({ opacity: lueur.value }));

  return (
    <Animated.View style={[styles.grille, anime]} accessibilityRole="progressbar" accessibilityLabel={t('commun.chargement')}>
      {Array.from({ length: rangees }, (_, r) => (
        <View key={r} style={styles.rangee}>
          {Array.from({ length: colonnes }, (_, c) => (
            <View key={c} style={[styles.carte, { width: largeur }]}>
              <View style={styles.photo} />
              <View style={styles.corps}>
                <View style={[styles.ligne, { width: '85%' }]} />
                <View style={[styles.ligne, { width: '55%' }]} />
                <View style={[styles.ligne, styles.prix]} />
                <View style={[styles.ligne, { width: '40%' }]} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grille: { gap: 12 },
  rangee: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  carte: { backgroundColor: colors.carte, borderRadius: 16, overflow: 'hidden' },
  photo: { aspectRatio: 4 / 3, backgroundColor: colors.sable2 },
  corps: { padding: 12, gap: 8 },
  ligne: { height: 10, borderRadius: 5, backgroundColor: colors.sable2 },
  prix: { width: '50%', height: 16, borderRadius: 6 },
});
