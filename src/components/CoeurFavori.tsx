import { useEffect, useRef } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { IconeFavori } from './Icones';

/** Icône favori qui « bat » quand on l'ajoute aux favoris (pas au premier affichage). */
export function CoeurFavori({ plein, couleur, taille }: { plein: boolean; couleur: string; taille?: number }) {
  const echelle = useSharedValue(1);
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    echelle.value = plein
      ? withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 220 }))
      : withSequence(withTiming(0.85, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 260 }));
  }, [plein, echelle]);
  const anime = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  return (
    <Animated.View style={anime}>
      <IconeFavori couleur={couleur} plein={plein} taille={taille} />
    </Animated.View>
  );
}
