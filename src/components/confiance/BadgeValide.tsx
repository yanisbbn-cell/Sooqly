import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconeCoche } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { colors } from '@/theme';

/**
 * Badge vert « Vendeur validé » (couleur de confiance).
 * - « rond » : pastille cochée posée sur la photo d'une carte ;
 * - « etiquette » : pastille avec le texte, à côté du nom.
 * Il ne change jamais l'ordre des annonces.
 */
export function BadgeValide({ forme = 'etiquette' }: { forme?: 'rond' | 'etiquette' }) {
  const { t } = useTranslation();
  if (forme === 'rond') {
    return (
      <View style={styles.rond} accessibilityRole="image" accessibilityLabel={t('confiance.vendeurValide')}>
        <IconeCoche couleur={colors.blanc} taille={16} epaisseur={3} />
      </View>
    );
  }
  return (
    <View style={styles.etiquette}>
      <IconeCoche couleur={colors.blanc} taille={12} epaisseur={3.4} />
      <Texte poids={700} style={{ fontSize: 12, color: colors.blanc }}>
        {t('confiance.vendeurValide')}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  rond: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.vert,
    borderWidth: 2,
    borderColor: colors.carte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.vert,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
