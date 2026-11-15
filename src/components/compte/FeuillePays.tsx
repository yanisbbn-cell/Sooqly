import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconeCoche } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { PAYS, type Pays } from '@/lib/telephone';
import { colors, toucheMin } from '@/theme';

type Props = { visible: boolean; valeur: Pays; onChoisir: (p: Pays) => void; onFermer: () => void };

/** Feuille « Pays du numéro » : les pays dont le numéro de mobile est accepté. */
export function FeuillePays({ visible, valeur, onChoisir, onFermer }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer}>
      <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Pressable style={styles.fond} onPress={onFermer} accessibilityLabel={t('commun.fermer')} />
        <View style={[styles.feuille, { paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
          <View style={styles.poignee} />
          <View style={styles.ligneTitre}>
            <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
              {t('compte.pays')}
            </Texte>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              style={({ pressed }) => [styles.fermer, pressed && { opacity: 0.7 }]}
            >
              <Texte style={styles.fermerTexte}>×</Texte>
            </Pressable>
          </View>
          {PAYS.map((p) => {
            const choisi = p.cle === valeur.cle;
            return (
              <Pressable
                key={p.cle}
                onPress={() => {
                  onChoisir(p);
                  onFermer();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: choisi }}
                style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: colors.carte }]}
              >
                <Texte variante="titre" poids={700} style={styles.indicatif}>
                  +{p.indicatif}
                </Texte>
                <Texte poids={choisi ? 700 : 400} style={styles.nom}>
                  {t(`pays.${p.cle}`)}
                </Texte>
                {choisi && <IconeCoche couleur={colors.accent} taille={20} epaisseur={2.6} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, justifyContent: 'flex-end' },
  fond: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.55)' },
  feuille: { backgroundColor: colors.blanc, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: 20 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.sable3, marginBottom: 12 },
  ligneTitre: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  titre: { flex: 1, fontSize: 20 },
  fermer: {
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    backgroundColor: colors.sable2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fermerTexte: { fontSize: 22, lineHeight: 26, textAlign: 'center' },
  ligne: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  indicatif: { width: 52, fontSize: 14, color: colors.brunMoyen, writingDirection: 'ltr' },
  nom: { flex: 1, fontSize: 15 },
});
