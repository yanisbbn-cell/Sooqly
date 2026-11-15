import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

import { BoutonLangue } from './BoutonLangue';
import { Logo } from './Logo';
import { Texte } from './Texte';

/** En-tête brun : logo, slogan et bouton de langue. */
export function EnTete() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: insets.top + 18 }]}>
      <View style={styles.marque}>
        <View style={styles.logo}>
          <Logo />
        </View>
        <Texte style={styles.slogan}>{t('app.tagline')}</Texte>
      </View>
      <BoutonLangue />
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: colors.brun,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  marque: { flex: 1, gap: 4 },
  // Le logo reste à gauche du bloc en français, à droite en arabe, mais s'écrit toujours de gauche à droite.
  logo: { alignSelf: 'flex-start', direction: 'ltr' },
  slogan: { fontSize: 12, color: colors.sable3 },
});
