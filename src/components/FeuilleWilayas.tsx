import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePreferences } from '@/lib/preferences';
import { normaliser, numeroWilaya, useWilayas, type Wilaya } from '@/lib/referentiel';
import { colors, fonts, toucheMin } from '@/theme';

import { EtatChargement } from './EtatChargement';
import { IconeCoche, IconeLoupe } from './Icones';
import { Texte } from './Texte';

type Props = {
  visible: boolean;
  valeur: number | null;
  onChoisir: (code: number) => void;
  onFermer: () => void;
};

/** Feuille « Choisir la wilaya » : les 69 wilayas lues dans Supabase, avec recherche par nom ou numéro. */
export function FeuilleWilayas({ visible, valeur, onChoisir, onFermer }: Props) {
  const { t } = useTranslation();
  const { langue, rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  const { donnees, erreur, reessayer } = useWilayas();
  const [recherche, setRecherche] = useState('');

  const lignes = useMemo(() => {
    const q = normaliser(recherche);
    if (!donnees || !q) return donnees ?? [];
    return donnees.filter(
      (w) =>
        normaliser(w.nom_fr).includes(q) || normaliser(w.nom_ar).includes(q) || numeroWilaya(w.code).startsWith(q),
    );
  }, [donnees, recherche]);

  const fermer = () => {
    setRecherche('');
    onFermer();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fermer}>
      <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Pressable style={styles.fond} onPress={fermer} accessibilityLabel={t('commun.fermer')} />
        <View style={[styles.feuille, { paddingBottom: insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.haut}>
            <View style={styles.poignee} />
            <View style={styles.ligneTitre}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {t('wilayas.titre')}
              </Texte>
              <Pressable
                onPress={fermer}
                accessibilityRole="button"
                accessibilityLabel={t('commun.fermer')}
                style={({ pressed }) => [styles.fermer, pressed && { opacity: 0.7 }]}
              >
                <Texte style={styles.fermerTexte}>×</Texte>
              </Pressable>
            </View>
            <View style={styles.recherche}>
              <IconeLoupe couleur={colors.brunMoyen} />
              <TextInput
                value={recherche}
                onChangeText={setRecherche}
                placeholder={t('wilayas.recherche')}
                placeholderTextColor={colors.brunMoyen}
                accessibilityLabel={t('wilayas.recherche')}
                autoCorrect={false}
                returnKeyType="search"
                style={[
                  styles.champ,
                  { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' },
                ]}
              />
            </View>
          </View>

          {!donnees ? (
            <EtatChargement erreur={erreur} reessayer={reessayer} />
          ) : (
            <FlatList
              data={lignes}
              keyExtractor={(w) => String(w.code)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.liste}
              ListEmptyComponent={<Texte style={styles.aucune}>{t('wilayas.aucune')}</Texte>}
              renderItem={({ item }) => (
                <LigneWilaya
                  wilaya={item}
                  nom={langue === 'ar' ? item.nom_ar : item.nom_fr}
                  choisie={item.code === valeur}
                  onPress={() => {
                    onChoisir(item.code);
                    fermer();
                  }}
                />
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function LigneWilaya({ wilaya, nom, choisie, onPress }: { wilaya: Wilaya; nom: string; choisie: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: choisie }}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: colors.carte }]}
    >
      <Texte variante="titre" poids={700} style={styles.numero}>
        {numeroWilaya(wilaya.code)}
      </Texte>
      <Texte poids={choisie ? 700 : 400} style={styles.nom}>
        {nom}
      </Texte>
      {choisie && <IconeCoche couleur={colors.accent} taille={20} epaisseur={2.6} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, justifyContent: 'flex-end' },
  fond: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.55)' },
  feuille: { height: '82%', backgroundColor: colors.blanc, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  haut: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.sable2,
  },
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
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.carte,
    borderWidth: 1,
    borderColor: colors.sable3,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  champ: { flex: 1, minWidth: 0, fontSize: 15, color: colors.brun, height: '100%' },
  liste: { paddingHorizontal: 20, paddingBottom: 20 },
  aucune: { marginTop: 16, fontSize: 14, color: colors.brunMoyen },
  ligne: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.sable2,
  },
  // #6B5440 plutôt que #9C7C5D pour garder un contraste d'au moins 4,5 pour 1 sur fond blanc.
  numero: { width: 34, fontSize: 13, color: colors.brunMoyen },
  nom: { flex: 1, fontSize: 15 },
});
