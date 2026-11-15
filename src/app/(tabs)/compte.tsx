import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BoutonLangue } from '@/components/BoutonLangue';
import { EcranProvisoire } from '@/components/EcranProvisoire';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

export default function Compte() {
  const { t } = useTranslation();
  const { revoirAccueil } = usePreferences();
  return (
    <EcranProvisoire titre={t('ecrans.compte.titre')} texte={t('ecrans.compte.bientot')}>
      <View style={styles.ligne}>
        <View style={styles.ligneTexte}>
          <Texte poids={700} style={styles.libelle}>
            {t('langue.titre')}
          </Texte>
          <Texte style={styles.valeur}>{t('langue.actuelle')}</Texte>
        </View>
        <View style={styles.boutonLangue}>
          <BoutonLangue />
        </View>
      </View>
      <Pressable
        onPress={revoirAccueil}
        accessibilityRole="button"
        style={({ pressed }) => [styles.bouton, pressed && { opacity: 0.7 }]}
      >
        <Texte poids={700} style={styles.boutonTexte}>
          {t('ecrans.compte.revoir')}
        </Texte>
      </Pressable>
    </EcranProvisoire>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.sable2,
  },
  ligneTexte: { flex: 1, gap: 2 },
  libelle: { fontSize: 15 },
  valeur: { fontSize: 13, color: colors.brunMoyen },
  boutonLangue: { backgroundColor: colors.brun, borderRadius: 12 },
  bouton: {
    minHeight: toucheMin + 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  boutonTexte: { color: colors.accentFonce, fontSize: 15, textAlign: 'center' },
});
