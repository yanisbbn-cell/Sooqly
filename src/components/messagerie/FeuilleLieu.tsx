import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { IconeLieu } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

type Props = {
  visible: boolean;
  onFermer: () => void;
  onEnvoyer: (nom: string, position: { lat: number; lng: number } | null) => Promise<void>;
};

/** Proposer un lieu de rendez-vous public : son nom, et si on le souhaite sa position actuelle. */
export function FeuilleLieu({ visible, onFermer, onEnvoyer }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  const [nom, setNom] = useState('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [etatPosition, setEtatPosition] = useState<'aucune' | 'recherche' | 'ok' | 'refusee'>('aucune');
  const [occupe, setOccupe] = useState(false);

  const joindre = async () => {
    setEtatPosition('recherche');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return setEtatPosition('refusee');
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 });
      setEtatPosition('ok');
    } catch {
      setEtatPosition('refusee');
    }
  };

  const envoyer = async () => {
    if (!nom.trim()) return;
    setOccupe(true);
    await onEnvoyer(nom, position);
    setOccupe(false);
    setNom('');
    setPosition(null);
    setEtatPosition('aucune');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer}>
      <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Pressable style={styles.fond} onPress={onFermer} accessibilityLabel={t('commun.fermer')} />
        <View style={[styles.feuille, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
          <View style={styles.poignee} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconeLieu couleur={colors.accent} />
            <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
              {t('messagerie.lieuTitre')}
            </Texte>
          </View>
          <Texte style={{ fontSize: 13, lineHeight: 19, color: colors.vert }}>{t('messagerie.lieuConseil')}</Texte>
          <Champ libelle={t('messagerie.lieuNom')} placeholder={t('messagerie.lieuEx')} value={nom} onChangeText={setNom} maxLength={120} />
          <Pressable
            onPress={joindre}
            disabled={etatPosition === 'recherche' || etatPosition === 'ok'}
            accessibilityRole="button"
            style={styles.position}
          >
            <Texte poids={700} style={{ fontSize: 14, color: etatPosition === 'ok' ? colors.vert : colors.brun }}>
              {etatPosition === 'ok'
                ? t('messagerie.positionAjoutee')
                : etatPosition === 'refusee'
                  ? t('messagerie.positionRefusee')
                  : t('messagerie.joindrePosition')}
            </Texte>
          </Pressable>
          <Bouton libelle={t('messagerie.envoyerLieu')} onPress={envoyer} actif={!!nom.trim()} occupe={occupe} />
          <Bouton libelle={t('commun.fermer')} onPress={onFermer} variante="contour" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, justifyContent: 'flex-end' },
  fond: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.55)' },
  feuille: { backgroundColor: colors.blanc, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20, gap: 12 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.sable3 },
  position: {
    minHeight: toucheMin,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
