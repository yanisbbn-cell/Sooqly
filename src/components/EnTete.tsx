import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FILTRES_VIDES, useRecherche } from '@/lib/recherche';
import { colors, toucheMin } from '@/theme';

import { BoutonLangue } from './BoutonLangue';
import { Logo } from './Logo';
import { Texte } from './Texte';

/** En-tête brun : logo (retour à l'accueil, recherche effacée), slogan et bouton de langue. */
export function EnTete() {
  const { t } = useTranslation();
  const { setFiltres, setTri } = useRecherche();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: insets.top + 18 }]}>
      <View style={styles.marque}>
        <Pressable
          onPress={() => {
            setFiltres(FILTRES_VIDES);
            setTri('recent');
            router.navigate('/');
          }}
          accessibilityRole="link"
          accessibilityLabel={t('app.retourAccueil')}
          hitSlop={8}
          style={({ pressed }) => [styles.logo, pressed && { opacity: 0.7 }]}
        >
          <Logo />
        </Pressable>
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
  logo: { alignSelf: 'flex-start', direction: 'ltr', minHeight: toucheMin, justifyContent: 'center' },
  slogan: { fontSize: 12, color: colors.sable3 },
});
