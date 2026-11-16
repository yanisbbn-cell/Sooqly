import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { criteresPour, enregistrerNote, type TransactionANoter } from '@/lib/confiance';
import { colors } from '@/theme';

import { Etoiles } from './Etoiles';
import { Feuille } from './Feuille';

type Props = {
  transaction: TransactionANoter | null;
  onFermer: () => void;
  /** Appelé après l'enregistrement de la note. */
  onNote: () => void;
};

/**
 * Notation rapide : une note en étoiles, puis 3 critères pré-remplis avec la même note (ajustables).
 * Acheteur → vendeur : conformité, ponctualité, comportement. Vendeur → acheteur : ponctualité, paiement, comportement.
 */
export function FeuilleNote({ transaction: tx, onFermer, onNote }: Props) {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [note, setNote] = useState(0);
  const [criteres, setCriteres] = useState<(number | null)[]>([null, null, null]);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    setNote(tx?.note ?? 0);
    setCriteres(tx?.note_id ? [tx.critere_1, tx.critere_2, tx.critere_3] : [null, null, null]);
    setErreur(false);
  }, [tx]);

  if (!tx) return null;
  const location = tx.type === 'location';
  const acheteur = tx.mon_role === 'acheteur';
  const titre = location ? t('confiance.commentLocation') : acheteur ? t('confiance.commentAchat') : t('confiance.commentVente');
  const sous = t(
    acheteur ? (location ? 'confiance.sousLoueur' : 'confiance.sousVendeur') : location ? 'confiance.sousLocataire' : 'confiance.sousAcheteur',
    { titre: tx.titre, nom: tx.autre_nom },
  );
  const mots = t('confiance.mots', { returnObjects: true }) as unknown as string[];
  const valeurs = criteres.map((c) => c ?? note) as [number, number, number];

  const envoyer = async () => {
    if (!profil || !note) return;
    setOccupe(true);
    setErreur(false);
    const ok = await enregistrerNote(tx, profil.id, { note, criteres: valeurs });
    setOccupe(false);
    if (!ok) return setErreur(true);
    onNote();
  };

  return (
    <Feuille visible onFermer={onFermer} titre={t('confiance.noterTransaction')}>
      <View style={{ gap: 4 }}>
        <Texte variante="titre" poids={700} style={{ fontSize: 20, textAlign: 'center' }} accessibilityRole="header">
          {titre}
        </Texte>
        <Texte style={{ fontSize: 13, color: colors.brunMoyen, textAlign: 'center' }}>{sous}</Texte>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Etoiles valeur={note} onChoisir={setNote} taille={42} zone={56} />
      </View>
      <Texte poids={700} style={{ fontSize: 15, textAlign: 'center', minHeight: 22 }} accessibilityLiveRegion="polite">
        {note ? mots[note] : t('confiance.touchezEtoile')}
      </Texte>
      {note > 0 && (
        <View style={styles.criteres}>
          <Texte poids={700} style={styles.surtitre}>
            {t('confiance.detailRempli')}
          </Texte>
          {criteresPour(tx.mon_role).map((c, i) => (
            <View key={c} style={styles.critere}>
              <Texte poids={600} style={{ fontSize: 14 }}>
                {t(`confiance.criteres.${c}`)}
              </Texte>
              <Etoiles
                valeur={valeurs[i]}
                taille={24}
                zone={44}
                onChoisir={(n) => setCriteres((l) => l.map((x, j) => (j === i ? n : x)))}
              />
            </View>
          ))}
        </View>
      )}
      {erreur && (
        <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
          {t('confiance.erreur')}
        </Texte>
      )}
      <Bouton libelle={t('confiance.envoyerNote')} onPress={envoyer} actif={note > 0} occupe={occupe} />
      <Bouton libelle={t('confiance.plusTard')} onPress={onFermer} variante="contour" />
    </Feuille>
  );
}

const styles = StyleSheet.create({
  criteres: { backgroundColor: colors.carte, borderRadius: 14, padding: 12, gap: 4 },
  surtitre: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.brunMoyen },
  critere: { paddingTop: 6, alignItems: 'flex-start' },
});
