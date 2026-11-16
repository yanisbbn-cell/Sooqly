import { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { monParrainage } from '@/lib/parrainage';
import { usePreferences } from '@/lib/preferences';
import { colors, fonts, toucheMin } from '@/theme';

/** Carte « Invitez vos proches » : code personnel, partage, nombre de personnes inscrites grâce au membre. */
export function CarteParrainage({ membreId }: { membreId: string }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const [donnees, setDonnees] = useState<{ code: string; filleuls: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      monParrainage(membreId).then(setDonnees, () => setDonnees(null));
    }, [membreId]),
  );

  if (!donnees) return null;
  const partager = () => Share.share({ message: t('parrainage.message', { code: donnees.code }) }).catch(() => undefined);

  return (
    <View style={styles.carte}>
      <Texte variante="titre" poids={700} style={{ fontSize: 18, color: colors.sable1 }}>
        {t('parrainage.titre')}
      </Texte>
      <Texte style={{ fontSize: 13, lineHeight: 19, color: colors.sable3 }}>{t('parrainage.texte')}</Texte>
      {/* Le hadith en arabe s'écrit avec Amiri (règle du projet). */}
      <Texte style={[{ fontSize: 14, lineHeight: 22, color: colors.sable1 }, langue === 'ar' && { fontFamily: fonts.coran[400], fontSize: 17, lineHeight: 30 }]}>
        {t('parrainage.hadith')}
      </Texte>
      <View style={styles.ligne}>
        <View style={styles.code}>
          <Texte style={{ fontSize: 11, color: colors.sable3 }}>{t('parrainage.code')}</Texte>
          <Texte variante="titre" poids={700} style={{ fontSize: 20, color: colors.sable1, letterSpacing: 2, writingDirection: 'ltr' }} selectable>
            {donnees.code}
          </Texte>
        </View>
        <Pressable onPress={partager} accessibilityRole="button" style={({ pressed }) => [styles.partager, pressed && { opacity: 0.85 }]}>
          <Texte poids={700} style={{ fontSize: 15, color: colors.blanc }}>
            {t('parrainage.partager')}
          </Texte>
        </Pressable>
      </View>
      <Texte poids={600} style={{ fontSize: 13, color: donnees.filleuls ? colors.vertBord : colors.sable3 }}>
        {t('parrainage.compte', { count: donnees.filleuls })}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.brun, borderRadius: 16, padding: 16, gap: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { flex: 1, gap: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.sable4 },
  partager: { minHeight: toucheMin + 4, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center' },
});
