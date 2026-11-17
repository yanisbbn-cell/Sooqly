import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { LogoAccueil } from './LogoAccueil';

/** Barre brune en haut de chaque écran (sauf l'accueil) : le logo Sooqly, à un appui de l'accueil. */
export function BarreLogo() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barre, { paddingTop: insets.top + 4 }]}>
      <LogoAccueil taille={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  barre: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 0 },
});
