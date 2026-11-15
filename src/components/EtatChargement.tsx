import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, toucheMin } from '@/theme';

import { Texte } from './Texte';

/** Affiche « chargement » ou un message d'erreur avec un bouton Réessayer. */
export function EtatChargement({ erreur, reessayer }: { erreur: boolean; reessayer: () => void }) {
  const { t } = useTranslation();
  if (!erreur) {
    return (
      <View style={styles.centre} accessibilityLabel={t('commun.chargement')}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return (
    <View style={styles.centre}>
      <Texte style={styles.erreur}>{t('commun.erreur')}</Texte>
      <Pressable
        onPress={reessayer}
        accessibilityRole="button"
        style={({ pressed }) => [styles.bouton, pressed && { opacity: 0.7 }]}
      >
        <Texte poids={700} style={styles.boutonTexte}>
          {t('commun.reessayer')}
        </Texte>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  erreur: { fontSize: 15, lineHeight: 22, color: colors.rouge, textAlign: 'center' },
  bouton: {
    minHeight: toucheMin,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonTexte: { color: colors.blanc, fontSize: 15 },
});
