import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import type { Sexe } from '@/lib/auth';
import { colors, toucheMin } from '@/theme';

/** « Vous êtes : Homme / Femme » — choix privé, utilisé seulement pour la règle des cours particuliers. */
export function ChoixSexe({ valeur, onChoisir }: { valeur: Sexe | null; onChoisir: (s: Sexe) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.bloc}>
      <Texte poids={600} style={{ fontSize: 13 }}>
        {t('sexe.question')}
      </Texte>
      <View style={styles.deux} accessibilityRole="radiogroup">
        {(['h', 'f'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => onChoisir(s)}
            accessibilityRole="radio"
            accessibilityState={{ checked: valeur === s }}
            style={[styles.pastille, valeur === s && styles.pastilleActive]}
          >
            <Texte poids={600} style={[styles.pastilleTexte, valeur === s && { color: colors.sable1 }]}>
              {t(s === 'h' ? 'sexe.homme' : 'sexe.femme')}
            </Texte>
          </Pressable>
        ))}
      </View>
      <Texte style={styles.aide}>{t('sexe.aide')}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 8 },
  deux: { flexDirection: 'row', gap: 12 },
  pastille: {
    flex: 1,
    minHeight: toucheMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable4,
  },
  pastilleActive: { backgroundColor: colors.brun, borderColor: colors.brun },
  pastilleTexte: { fontSize: 14, textAlign: 'center' },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
});
