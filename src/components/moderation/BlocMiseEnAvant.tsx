import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Texte } from '@/components/Texte';
import { DUREES_MISE_EN_AVANT, sponsoriser } from '@/lib/admin';
import { estSponsorisee, type Annonce } from '@/lib/annonces';
import { formaterNombre } from '@/lib/prix';
import { useReglages } from '@/lib/referentiel';
import { colors } from '@/theme';

/** Administrateur : sponsoriser une annonce de pro pendant 7, 15 ou 30 jours, ou arrêter. */
export function BlocMiseEnAvant({ annonce, onFait }: { annonce: Annonce; onFait: () => void }) {
  const { t } = useTranslation();
  const { donnees: reglages } = useReglages();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);
  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const actif = estSponsorisee(annonce);
  const fin = annonce.sponsorise_jusqu ? new Date(annonce.sponsorise_jusqu) : null;

  const agir = async (jours: number | null) => {
    setOccupe(true);
    setErreur(false);
    const ok = await sponsoriser(annonce.id, jours);
    setOccupe(false);
    if (ok) onFait();
    else setErreur(true);
  };

  if (!annonce.auteur?.est_pro || !['en_ligne', 'reserve'].includes(annonce.statut)) {
    return (
      <View style={styles.bloc}>
        <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
          {t('miseEnAvant.titre')}
        </Texte>
        <Texte style={styles.aide}>{t('miseEnAvant.reservee')}</Texte>
      </View>
    );
  }

  return (
    <View style={styles.bloc}>
      <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
        {t('miseEnAvant.titre')}
      </Texte>
      <Texte poids={600} style={{ fontSize: 13, color: actif ? colors.vert : colors.brunMoyen }}>
        {actif && fin ? t('miseEnAvant.jusqu', { date: `${fin.getDate()} ${mois[fin.getMonth()]} ${fin.getFullYear()}` }) : t('miseEnAvant.non')}
      </Texte>
      {erreur && (
        <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
          {t('miseEnAvant.erreur')}
        </Texte>
      )}
      {DUREES_MISE_EN_AVANT.map((j) => {
        const prix = reglages?.tarifs_mise_en_avant?.[String(j)];
        return (
          <Bouton
            key={j}
            libelle={prix ? t('miseEnAvant.prix', { n: j, prix: formaterNombre(prix) }) : t('miseEnAvant.pourJours', { n: j })}
            onPress={() => agir(j)}
            occupe={occupe}
            variante="sombre"
          />
        );
      })}
      {actif && <Bouton libelle={t('miseEnAvant.arreter')} onPress={() => agir(null)} variante="contour" />}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.sable3 },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
});
