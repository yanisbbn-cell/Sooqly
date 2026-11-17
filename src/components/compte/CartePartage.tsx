import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { SITE } from '@/lib/site';
import { colors, fonts, toucheMin } from '@/theme';

/** Carte « Partagez Sooqly » : un bouton pour envoyer le lien de l'application à ses proches (sans code ni compteur). */
export function CartePartage() {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const partager = () => Share.share({ message: t('partage.message', { lien: SITE }) }).catch(() => undefined);

  return (
    <View style={styles.carte}>
      <Texte variante="titre" poids={700} style={{ fontSize: 18, color: colors.sable1 }}>
        {t('partage.titre')}
      </Texte>
      <Texte style={{ fontSize: 13, lineHeight: 19, color: colors.sable3 }}>{t('partage.texte')}</Texte>
      {/* Le hadith en arabe s'écrit avec Amiri (règle du projet). */}
      <Texte style={[{ fontSize: 14, lineHeight: 22, color: colors.sable1 }, langue === 'ar' && { fontFamily: fonts.coran[400], fontSize: 17, lineHeight: 30 }]}>
        {t('partage.hadith')}
      </Texte>
      <Pressable onPress={partager} accessibilityRole="button" style={({ pressed }) => [styles.partager, pressed && { opacity: 0.85 }]}>
        <Texte poids={700} style={{ fontSize: 15, color: colors.blanc }}>
          {t('partage.bouton')}
        </Texte>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.brun, borderRadius: 16, padding: 16, gap: 10 },
  partager: {
    alignSelf: 'flex-start',
    minHeight: toucheMin + 4,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
});
