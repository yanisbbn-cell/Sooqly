import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { IconeCoche } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import type { Categorie } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

type Props = {
  categorie: Categorie | null;
  choisies: number[];
  onValider: (sousCategories: number[]) => void;
  onFermer: () => void;
};

/** Feuille des sous-catégories d'une catégorie : choix multiple, ou « Toutes les annonces ». */
export function FeuilleSousCategories({ categorie, choisies, onValider, onFermer }: Props) {
  const { t } = useTranslation();
  const { langue, rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<number[]>(choisies);
  useEffect(() => setSelection(choisies), [choisies, categorie]);

  const basculer = (id: number) =>
    setSelection(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]);

  return (
    <Modal visible={!!categorie} transparent animationType="slide" onRequestClose={onFermer}>
      <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
        <Pressable style={styles.fond} onPress={onFermer} accessibilityLabel={t('commun.fermer')} />
        {categorie && (
          <View style={[styles.feuille, { paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
            <View style={styles.poignee} />
            <View style={styles.ligneTitre}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {langue === 'ar' ? categorie.nom_ar : categorie.nom_fr}
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
            <ScrollView style={{ flexGrow: 0 }}>
              <Ligne libelle={t('accueil2.toutesAnnonces')} coche={selection.length === 0} onPress={() => setSelection([])} gras />
              {categorie.sous_categories.map((s) => (
                <Ligne
                  key={s.id}
                  libelle={langue === 'ar' ? s.nom_ar : s.nom_fr}
                  coche={selection.includes(s.id)}
                  onPress={() => basculer(s.id)}
                  caseACocher
                />
              ))}
            </ScrollView>
            <View style={{ paddingTop: 12 }}>
              <Bouton libelle={t('accueil2.voirAnnonces')} onPress={() => onValider(selection)} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Ligne({
  libelle,
  coche,
  onPress,
  caseACocher,
  gras,
}: {
  libelle: string;
  coche: boolean;
  onPress: () => void;
  caseACocher?: boolean;
  gras?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={caseACocher ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: coche }}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: colors.carte }]}
    >
      {caseACocher ? (
        <View style={[styles.case, coche && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
          {coche && <IconeCoche couleur={colors.blanc} taille={13} />}
        </View>
      ) : null}
      <Texte poids={coche || gras ? 700 : 400} style={{ flex: 1, fontSize: 15 }}>
        {libelle}
      </Texte>
      {!caseACocher && coche && <IconeCoche couleur={colors.accent} taille={20} epaisseur={2.6} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, justifyContent: 'flex-end' },
  fond: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.55)' },
  feuille: {
    maxHeight: '86%',
    backgroundColor: colors.blanc,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
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
  case: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.sable4, alignItems: 'center', justifyContent: 'center' },
});
