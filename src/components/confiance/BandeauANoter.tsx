import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { oublierBadge, transactionsANoter, type TransactionANoter } from '@/lib/confiance';
import { colors, toucheMin } from '@/theme';

import { FeuilleNote } from './FeuilleNote';

/** Accueil : « Transaction terminée · Noter » tant qu'une vente ou une location conclue n'est pas notée (maquette). */
export function BandeauANoter() {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [tx, setTx] = useState<TransactionANoter | null>(null);
  const [ouverte, setOuverte] = useState(false);
  const [merci, setMerci] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profil) return setTx(null);
      transactionsANoter().then((l) => setTx(l.find((x) => !x.note_id) ?? null), () => setTx(null));
    }, [profil]),
  );

  if (merci) {
    return (
      <Pressable onPress={() => setMerci(false)} accessibilityRole="button" style={styles.merci}>
        <Texte style={{ fontSize: 13, lineHeight: 19 }}>
          <Texte poids={700} style={{ fontSize: 13 }}>
            {t('confiance.merciNote')}
          </Texte>{' '}
          {t('confiance.merciNoteTexte')}
        </Texte>
      </Pressable>
    );
  }
  if (!tx) return null;
  const location = tx.type === 'location';
  const cle =
    tx.mon_role === 'acheteur'
      ? location
        ? 'confiance.aNoterLocataire'
        : 'confiance.aNoterAchat'
      : location
        ? 'confiance.aNoterLocation'
        : 'confiance.aNoterVente';

  return (
    <View style={styles.bandeau} accessibilityRole="summary">
      <View style={{ flex: 1, gap: 2 }}>
        <Texte poids={700} style={{ fontSize: 14 }}>
          {t('confiance.transactionTerminee')}
        </Texte>
        <Texte style={{ fontSize: 12, lineHeight: 17, color: colors.brunMoyen }}>{t(cle, { titre: tx.titre, nom: tx.autre_nom })}</Texte>
      </View>
      <Pressable onPress={() => setOuverte(true)} accessibilityRole="button" style={styles.noter}>
        <Texte poids={700} style={{ fontSize: 14, color: colors.sable1 }}>
          {t('confiance.noter')}
        </Texte>
      </Pressable>
      {ouverte && (
        <FeuilleNote
          transaction={tx}
          onFermer={() => setOuverte(false)}
          onNote={() => {
            oublierBadge(tx.autre_id);
            setOuverte(false);
            setTx(null);
            setMerci(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.carte,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noter: { minHeight: toucheMin, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.brun, justifyContent: 'center' },
  merci: { marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.sable2 },
});
