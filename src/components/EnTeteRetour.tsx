import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

import { IconeRetour } from './Icones';
import { Texte } from './Texte';

/** En-tête brun d'un écran secondaire : flèche Retour et titre. */
export function EnTeteRetour({ titre }: { titre: string }) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: insets.top + 14 }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/compte'))}
        accessibilityRole="button"
        accessibilityLabel={t('commun.retour')}
        hitSlop={6}
        style={({ pressed }) => [styles.retour, pressed && { opacity: 0.7 }]}
      >
        {/* La flèche pointe vers la droite en arabe. */}
        <View style={rtl && { transform: [{ scaleX: -1 }] }}>
          <IconeRetour couleur={colors.sable1} />
        </View>
      </Pressable>
      <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
        {titre}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: colors.brun,
    paddingBottom: 14,
    paddingStart: 12,
    paddingEnd: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retour: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  titre: { flex: 1, fontSize: 20, color: colors.sable1 },
});
