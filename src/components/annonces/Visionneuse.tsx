import { useState } from 'react';
import { useInsetsEcran } from '@/lib/insets';
import { FlatList, Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';

import { IconeFermer } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

type Props = {
  /** Adresses des photos, dans l'ordre. */
  photos: string[];
  depart: number;
  visible: boolean;
  onFermer: () => void;
};

const ZOOM_MAX = 4;
const ZOOM_DOUBLE = 2.5;

/**
 * Photos d'une annonce en plein écran : glisser pour changer de photo, zoomer à deux doigts
 * ou d'un double toucher, fermer avec la croix ou en glissant la photo vers le bas.
 */
export function Visionneuse({ photos, depart, visible, onFermer }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useInsetsEcran();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(depart);
  const [zoome, setZoome] = useState(false);
  const fond = useSharedValue(1);
  const styleFond = useAnimatedStyle(() => ({ opacity: fond.value }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <GestureHandlerRootView style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, styleFond]} />
        <FlatList
          data={photos}
          keyExtractor={(u, i) => `${i}-${u}`}
          horizontal
          pagingEnabled
          scrollEnabled={!zoome}
          initialScrollIndex={depart}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <PhotoZoomable uri={item} largeur={width} hauteur={height} fond={fond} onZoom={setZoome} onFermer={onFermer} />
          )}
        />
        <View style={[styles.haut, { top: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={onFermer} accessibilityRole="button" accessibilityLabel={t('commun.fermer')} style={styles.fermer} hitSlop={8}>
            <IconeFermer couleur={colors.blanc} />
          </Pressable>
        </View>
        {photos.length > 1 && (
          <View style={[styles.compteur, { bottom: insets.bottom + 20 }]} pointerEvents="none">
            <Texte poids={700} style={{ color: colors.blanc, fontSize: 14, writingDirection: 'ltr' }}>
              {index + 1} / {photos.length}
            </Texte>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function PhotoZoomable({
  uri,
  largeur,
  hauteur,
  fond,
  onZoom,
  onFermer,
}: {
  uri: string;
  largeur: number;
  hauteur: number;
  fond: { value: number };
  onZoom: (zoome: boolean) => void;
  onFermer: () => void;
}) {
  const [zoome, setZoomeLocal] = useState(false);
  const echelle = useSharedValue(1);
  const echelleDepart = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xDepart = useSharedValue(0);
  const yDepart = useSharedValue(0);

  const signalerZoom = (z: boolean) => {
    setZoomeLocal(z);
    onZoom(z);
  };

  // Garde la photo zoomée dans l'écran.
  const borner = (valeur: number, taille: number, e: number) => {
    'worklet';
    const max = Math.max(0, (taille * e - taille) / 2);
    return Math.min(max, Math.max(-max, valeur));
  };

  const pincer = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      echelle.value = Math.min(ZOOM_MAX, Math.max(1, echelleDepart.value * e.scale));
    },
    onDeactivate: () => {
      'worklet';
      if (echelle.value < 1.05) {
        echelle.value = withTiming(1);
        x.value = withTiming(0);
        y.value = withTiming(0);
      } else {
        x.value = borner(x.value, largeur, echelle.value);
        y.value = borner(y.value, hauteur, echelle.value);
      }
      echelleDepart.value = echelle.value < 1.05 ? 1 : echelle.value;
      xDepart.value = x.value;
      yDepart.value = y.value;
      scheduleOnRN(signalerZoom, echelle.value >= 1.05);
    },
  });

  // Photo zoomée : on la déplace. Photo normale : glisser vers le bas pour fermer (le glissement horizontal change de photo).
  const glisser = usePanGesture({
    maxPointers: zoome ? 2 : 1,
    activeOffsetY: zoome ? undefined : [-12, 12],
    failOffsetX: zoome ? undefined : [-20, 20],
    onUpdate: (e) => {
      'worklet';
      if (echelleDepart.value > 1) {
        x.value = borner(xDepart.value + e.translationX, largeur, echelle.value);
        y.value = borner(yDepart.value + e.translationY, hauteur, echelle.value);
      } else {
        y.value = e.translationY;
        fond.value = Math.max(0.3, 1 - Math.abs(e.translationY) / (hauteur * 0.6));
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (echelleDepart.value > 1) {
        xDepart.value = x.value;
        yDepart.value = y.value;
        return;
      }
      if (Math.abs(e.translationY) > 120 || Math.abs(e.velocityY) > 1200) {
        fond.value = 1;
        y.value = 0;
        scheduleOnRN(onFermer);
      } else {
        y.value = withTiming(0);
        fond.value = withTiming(1);
      }
    },
  });

  const doubleToucher = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: (e) => {
      'worklet';
      if (e.canceled) return;
      const zoomer = echelleDepart.value <= 1;
      echelle.value = withTiming(zoomer ? ZOOM_DOUBLE : 1);
      x.value = withTiming(0);
      y.value = withTiming(0);
      echelleDepart.value = zoomer ? ZOOM_DOUBLE : 1;
      xDepart.value = 0;
      yDepart.value = 0;
      scheduleOnRN(signalerZoom, zoomer);
    },
  });

  const gestes = useSimultaneousGestures(pincer, glisser, doubleToucher);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: echelle.value }],
  }));

  return (
    <View style={{ width: largeur, height: hauteur, overflow: 'hidden' }}>
      <GestureDetector gesture={gestes}>
        <Animated.View style={[{ width: largeur, height: hauteur }, style]}>
          <Image source={{ uri }} style={{ width: largeur, height: hauteur }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  haut: { position: 'absolute', start: 12, end: 12, flexDirection: 'row' },
  fermer: {
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compteur: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
});
