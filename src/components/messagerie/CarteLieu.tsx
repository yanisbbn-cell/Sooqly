import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { colors, toucheMin } from '@/theme';

/** Lien vers Plans (iPhone) ou Google Maps (Android, web) : aucune clé de service de cartes n'est nécessaire. */
export function lienCarte(nom: string, lat: number | null, lng: number | null) {
  const q = encodeURIComponent(nom);
  if (Platform.OS === 'ios') return lat !== null && lng !== null ? `http://maps.apple.com/?q=${q}&ll=${lat},${lng}` : `http://maps.apple.com/?q=${q}`;
  return lat !== null && lng !== null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Bulle « Lieu de rendez-vous » : nom du lieu public et bouton « Ouvrir dans Maps ». */
export function CarteLieu({ nom, lat, lng, clair }: { nom: string; lat: number | null; lng: number | null; clair: boolean }) {
  const { t } = useTranslation();
  const couleur = clair ? colors.sable1 : colors.brun;
  return (
    <View style={{ gap: 6, minWidth: 200 }}>
      <Texte poids={700} style={{ fontSize: 12, color: clair ? colors.sable3 : colors.brunMoyen }}>
        📍 {t('messagerie.lieuTitre')}
      </Texte>
      <Texte poids={700} style={{ fontSize: 15, color: couleur }}>
        {nom}
      </Texte>
      <Pressable
        onPress={() => Linking.openURL(lienCarte(nom, lat, lng))}
        accessibilityRole="link"
        style={[styles.bouton, { borderColor: couleur }]}
      >
        <Texte poids={700} style={{ fontSize: 13, color: couleur }}>
          {t('messagerie.ouvrirMaps')}
        </Texte>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bouton: { minHeight: toucheMin - 4, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
