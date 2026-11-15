import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePreferences } from '@/lib/preferences';
import { colors, fonts, toucheMin } from '@/theme';

import { IconeGlobe } from './Icones';

/** Bouton qui bascule entre le français et l'arabe. */
export function BoutonLangue() {
  const { t } = useTranslation();
  const { rtl, changerLangue } = usePreferences();
  return (
    <Pressable
      onPress={changerLangue}
      accessibilityRole="button"
      accessibilityLabel={t('langue.aria')}
      style={({ pressed }) => [styles.bouton, pressed && styles.appui]}
    >
      <IconeGlobe couleur={colors.sable1} />
      {/* Le nom de l'autre langue s'écrit dans sa propre police. */}
      <Text style={[styles.texte, { fontFamily: rtl ? fonts.texte[700] : fonts.arabe[700] }]}>{t('langue.bouton')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: toucheMin,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appui: { opacity: 0.7 },
  texte: { color: colors.sable1, fontSize: 15 },
});
