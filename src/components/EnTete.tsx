import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

import { BoutonLangue } from './BoutonLangue';
import { LogoAccueil } from './LogoAccueil';
import { Texte } from './Texte';

/** En-tête brun de l'accueil : logo (retour à l'accueil, recherche effacée), slogan et bouton de langue. */
export function EnTete() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Hors de l'accueil, le logo est déjà dans la barre du haut (BarreLogo) : on ne le répète pas.
  const accueil = usePathname() === '/';
  return (
    <View style={[styles.entete, { paddingTop: insets.top + 18 }]}>
      <View style={styles.marque}>
        {accueil && <LogoAccueil />}
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
  slogan: { fontSize: 12, color: colors.sable3 },
});
