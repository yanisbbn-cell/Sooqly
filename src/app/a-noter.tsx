import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { FeuilleNote } from '@/components/confiance/FeuilleNote';
import { oublierBadge, transactionsANoter, type TransactionANoter } from '@/lib/confiance';
import { colors, toucheMin } from '@/theme';

/** « Transactions à noter » : ventes et locations conclues, à noter (ou dont la note est encore modifiable 48 h). */
export default function ANoter() {
  const { t } = useTranslation();
  const [liste, setListe] = useState<TransactionANoter[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [choisie, setChoisie] = useState<TransactionANoter | null>(null);
  const [merci, setMerci] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setListe(await transactionsANoter());
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const resume = (x: TransactionANoter) => {
    const location = x.type === 'location';
    const cle =
      x.mon_role === 'acheteur'
        ? location
          ? 'confiance.aNoterLocataire'
          : 'confiance.aNoterAchat'
        : location
          ? 'confiance.aNoterLocation'
          : 'confiance.aNoterVente';
    return t(cle, { titre: x.titre, nom: x.autre_nom });
  };

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('confiance.transactionsANoter')} />
      <FlatList
        data={liste ?? []}
        keyExtractor={(x) => x.transaction_id}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          merci ? (
            <Pressable onPress={() => setMerci(false)} accessibilityRole="button" style={styles.merci}>
              <Texte style={{ fontSize: 13, lineHeight: 19 }}>
                <Texte poids={700} style={{ fontSize: 13 }}>
                  {t('confiance.merciNote')}
                </Texte>{' '}
                {t('confiance.merciNoteTexte')}
              </Texte>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          liste ? <Texte style={styles.vide}>{t('confiance.aucuneTransaction')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />
        }
        renderItem={({ item: x }) => (
          <View style={[styles.carte, !x.note_id && styles.carteANoter]}>
            <Pressable
              onPress={() => router.push({ pathname: '/membre/[id]', params: { id: x.autre_id } })}
              accessibilityRole="button"
              accessibilityLabel={x.autre_nom}
            >
              <ImageProfil numero={x.autre_avatar} taille={40} />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Texte poids={700} style={{ fontSize: 14 }}>
                {x.note_id ? x.titre : t('confiance.transactionTerminee')}
              </Texte>
              <Texte style={{ fontSize: 12, lineHeight: 17, color: colors.brunMoyen }}>
                {x.note_id ? t('confiance.noteModifiable', { note: x.note }) : resume(x)}
              </Texte>
            </View>
            <Pressable
              onPress={() => setChoisie(x)}
              accessibilityRole="button"
              style={[styles.bouton, x.note_id ? styles.boutonContour : null]}
            >
              <Texte poids={700} style={{ fontSize: 14, color: x.note_id ? colors.brun : colors.sable1 }}>
                {x.note_id ? t('confiance.modifierNote') : t('confiance.noter')}
              </Texte>
            </Pressable>
          </View>
        )}
      />
      {choisie && (
        <FeuilleNote
          transaction={choisie}
          onFermer={() => setChoisie(null)}
          onNote={() => {
            oublierBadge(choisie.autre_id);
            setChoisie(null);
            setMerci(true);
            charger();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 10 },
  vide: { fontSize: 14, color: colors.brunMoyen, textAlign: 'center', paddingTop: 24 },
  merci: { padding: 12, borderRadius: 14, backgroundColor: colors.sable2, marginBottom: 4 },
  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.carte },
  carteANoter: { borderWidth: 2, borderColor: colors.accent },
  bouton: { minHeight: toucheMin, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.brun, justifyContent: 'center' },
  boutonContour: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.sable4 },
});
