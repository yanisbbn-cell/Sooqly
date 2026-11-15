import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { AVATARS, type GroupeAvatar } from '@/lib/avatars';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

type Props = {
  visible: boolean;
  valeur: number | null;
  onChoisir: (numero: number) => void;
  onFermer: () => void;
};

/** Feuille « Image de profil » : 40 illustrations sans visage (20 Hommes, 20 Femmes), jamais de photo. */
export function FeuilleImagesProfil({ visible, valeur, onChoisir, onFermer }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  const groupeInitial = AVATARS.find((a) => a.numero === valeur)?.groupe ?? 'h';
  const [groupe, setGroupe] = useState<GroupeAvatar | null>(null);
  const actif = groupe ?? groupeInitial;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer}>
      <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Pressable style={styles.fond} onPress={onFermer} accessibilityLabel={t('commun.fermer')} />
        <View style={[styles.feuille, { paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
          <View style={styles.haut}>
            <View style={styles.poignee} />
            <View style={styles.ligneTitre}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {t('compte.imageProfil')}
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
            <Texte style={styles.regle}>{t('compte.regleImage')}</Texte>
            <View style={styles.onglets}>
              {(['h', 'f'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGroupe(g)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif === g }}
                  style={[styles.onglet, actif === g && styles.ongletActif]}
                >
                  <Texte poids={600} style={[styles.ongletTexte, actif === g && { color: colors.sable1 }]}>
                    {t(g === 'h' ? 'compte.hommes' : 'compte.femmes')}
                  </Texte>
                </Pressable>
              ))}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.grille}>
            {AVATARS.filter((a) => a.groupe === actif).map((a) => {
              const choisi = a.numero === valeur;
              const nom = t(`avatars.${a.cle}` as 'avatars.palmier');
              return (
                <Pressable
                  key={a.numero}
                  onPress={() => onChoisir(a.numero)}
                  accessibilityRole="button"
                  accessibilityLabel={nom}
                  accessibilityState={{ selected: choisi }}
                  style={({ pressed }) => [styles.case, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.anneau, choisi && { borderColor: colors.accent }]}>
                    <ImageProfil numero={a.numero} taille={64} />
                  </View>
                  <Texte poids={choisi ? 700 : 400} style={styles.nom} numberOfLines={2}>
                    {nom}
                  </Texte>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.bas}>
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              style={({ pressed }) => [styles.valider, pressed && { opacity: 0.8 }]}
            >
              <Texte poids={700} style={styles.validerTexte}>
                {t('compte.valider')}
              </Texte>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, justifyContent: 'flex-end' },
  fond: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.55)' },
  feuille: { height: '86%', backgroundColor: colors.blanc, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  haut: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  poignee: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.sable3 },
  ligneTitre: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  regle: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  onglets: { flexDirection: 'row', backgroundColor: colors.sable2, borderRadius: 12, padding: 4, gap: 4 },
  onglet: { flex: 1, height: toucheMin, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ongletActif: { backgroundColor: colors.brun },
  ongletTexte: { fontSize: 14, textAlign: 'center' },
  grille: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 16, rowGap: 14 },
  case: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  anneau: { borderWidth: 3, borderColor: 'transparent', borderRadius: 40, padding: 3 },
  nom: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  bas: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.sable2 },
  valider: { height: 52, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  validerTexte: { color: colors.blanc, fontSize: 16, textAlign: 'center' },
});
