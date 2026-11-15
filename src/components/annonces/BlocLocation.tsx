import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Calendrier } from '@/components/Calendrier';
import { Texte } from '@/components/Texte';
import { depuisTexte, estLibre, tarifCourt, totalDates, type Periode, type Tarif } from '@/lib/location';
import { formaterEuro, formaterNombre } from '@/lib/prix';
import { colors } from '@/theme';

const ORDRE = ['nuit', 'jour', 'semaine', 'mois', '6_mois', 'an'];

type Props = { tarifs: Tarif[]; periodes: Periode[]; vehicule: boolean; taux: number; debutInitial?: string; finInitiale?: string };

/** Fiche d'une location : tarifs, puis choix des dates avec le total pour toute la période. */
export function BlocLocation({ tarifs, periodes, vehicule, taux, debutInitial, finInitiale }: Props) {
  const { t } = useTranslation();
  const [debut, setDebut] = useState<string | null>(debutInitial ?? null);
  const [fin, setFin] = useState<string | null>(finInitiale ?? null);
  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const court = (d: string) => `${depuisTexte(d).getDate()} ${mois[depuisTexte(d).getMonth()]}`;
  const tries = [...tarifs].sort((a, b) => ORDRE.indexOf(a.unite) - ORDRE.indexOf(b.unite));

  const total = debut && fin ? totalDates(tarifs, debut, fin) : null;
  const libre = debut && fin ? estLibre(periodes, debut, fin) : true;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.carte}>
        <Texte poids={700} style={styles.etiquette}>
          {t('location.tarifs')}
        </Texte>
        {tries.map((x) => (
          <Texte key={x.unite} poids={600} style={{ fontSize: 14 }}>
            {`${formaterNombre(x.prix_da)} ${t('da')} ${t(`location.suffixe.${x.unite}`)}`}
          </Texte>
        ))}
      </View>

      {tarifCourt(tarifs) ? (
        <>
          <Texte variante="titre" poids={700} style={{ fontSize: 18 }}>
            {t('location.choisirDates')}
          </Texte>
          <Calendrier
            debut={debut}
            fin={fin}
            onChange={(d, f) => {
              setDebut(d);
              setFin(f);
            }}
            disponibilites={periodes}
            memeJour={vehicule}
          />
          <View style={[styles.resume, debut && fin && libre && total ? styles.resumeComplet : null]}>
            {!debut ? (
              <Texte poids={600} style={{ fontSize: 13 }}>
                {t(vehicule ? 'location.priseRetour' : 'location.arriveeDepart')}
              </Texte>
            ) : !fin ? (
              <Texte poids={600} style={{ fontSize: 13 }}>
                {t('location.choisirFin', { debut: court(debut) })}
              </Texte>
            ) : !libre ? (
              <Texte poids={700} style={{ fontSize: 13, color: colors.rouge }}>
                {t('location.pasLibre')}
              </Texte>
            ) : total ? (
              <>
                <Texte style={{ fontSize: 13, color: colors.sable1 }}>
                  {`${t('location.du', { debut: court(debut), fin: court(fin) })} · ${t('location.calcul', {
                    unites: t(`location.unites.${total.unite}`, { count: total.nombre }),
                    prix: formaterNombre(tarifs.find((x) => x.unite === total.unite)!.prix_da),
                  })}`}
                </Texte>
                <Texte variante="titre" poids={700} style={{ fontSize: 18, color: colors.blanc }}>
                  {t('location.total', { total: formaterNombre(total.total) })}
                </Texte>
                <Texte style={{ fontSize: 12, color: colors.sable3 }}>{formaterEuro(total.total, taux)}</Texte>
              </>
            ) : null}
          </View>
        </>
      ) : (
        <Texte style={styles.note}>{t('location.pasDeTarifCourt')}</Texte>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.carte, borderRadius: 14, padding: 14, gap: 4 },
  etiquette: { fontSize: 12, color: colors.brunMoyen },
  resume: { borderRadius: 14, padding: 14, gap: 4, backgroundColor: colors.sable2 },
  resumeComplet: { backgroundColor: colors.brun },
  note: { fontSize: 13, lineHeight: 20, color: colors.brunMoyen },
});
