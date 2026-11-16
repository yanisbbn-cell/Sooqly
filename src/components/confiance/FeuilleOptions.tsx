import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { colors, toucheMin } from '@/theme';

import { Feuille } from './Feuille';

export type Option = { libelle: string; onPress: () => void; danger?: boolean; accent?: boolean };

/** Menu d'options (⋮) d'une discussion : une action par ligne, puis « Annuler ». */
export function FeuilleOptions({ visible, options, onFermer }: { visible: boolean; options: Option[]; onFermer: () => void }) {
  const { t } = useTranslation();
  return (
    <Feuille visible={visible} onFermer={onFermer} titre={t('confiance.options')}>
      {options.map((o) => (
        <Pressable key={o.libelle} onPress={o.onPress} accessibilityRole="button" style={styles.ligne}>
          <Texte poids={700} style={{ fontSize: 15, color: o.danger ? colors.rouge : o.accent ? colors.accentFonce : colors.brun }}>
            {o.libelle}
          </Texte>
        </Pressable>
      ))}
      <Pressable onPress={onFermer} accessibilityRole="button" style={[styles.ligne, styles.annuler]}>
        <Texte poids={600} style={{ fontSize: 15, color: colors.brunMoyen }}>
          {t('confiance.annuler')}
        </Texte>
      </Pressable>
    </Feuille>
  );
}

const styles = StyleSheet.create({
  ligne: {
    minHeight: toucheMin + 8,
    borderRadius: 12,
    backgroundColor: colors.carte,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  annuler: { backgroundColor: 'transparent', alignItems: 'center' },
});
