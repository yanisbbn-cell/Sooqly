import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { Texte } from '@/components/Texte';
import { colors } from '@/theme';

type Section = { titre: string; texte: string };

/** Politique de confidentialité (exigée par Google Play et l'App Store), en français et en arabe. Adresse web : /confidentialite. */
export default function Confidentialite() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sections = t('confidentialite.sections', { returnObjects: true }) as unknown as Section[];
  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('confidentialite.titre')} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 32 }]}>
        <Texte style={styles.maj}>{t('confidentialite.maj')}</Texte>
        <Texte style={styles.texte}>{t('confidentialite.intro')}</Texte>
        {sections.map((s) => (
          <View key={s.titre} style={{ gap: 6 }}>
            <Texte variante="titre" poids={700} style={{ fontSize: 17 }} accessibilityRole="header">
              {s.titre}
            </Texte>
            <Texte style={styles.texte}>{s.texte}</Texte>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 18 },
  maj: { fontSize: 12, color: colors.brunMoyen },
  texte: { fontSize: 14, lineHeight: 22 },
});
