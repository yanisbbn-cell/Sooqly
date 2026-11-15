import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconeRetour } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { aujourdhui, depuisTexte, estLibre, versTexte, type Periode } from '@/lib/location';
import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

type Props = {
  debut: string | null;
  fin: string | null;
  /** Premier appui : début ; second appui : fin (si « plage »). */
  onChange: (debut: string | null, fin: string | null) => void;
  /** Faux : on ne choisit qu'une date de début (location de 1 mois, 6 mois, 1 an). */
  plage?: boolean;
  /** Si fourni : les jours hors de ces périodes sont grisés. */
  disponibilites?: Periode[];
  /** Pour un véhicule, le jour de retour peut être le jour de prise. */
  memeJour?: boolean;
};

/** Calendrier mensuel (semaine commençant le lundi), mois algériens en arabe. */
export function Calendrier({ debut, fin, onChange, plage = true, disponibilites, memeJour }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const auj = aujourdhui();
  const depart = depuisTexte(debut ?? auj);
  const [mois, setMois] = useState(new Date(depart.getFullYear(), depart.getMonth(), 1));
  const nomsMois = t('mois', { returnObjects: true }) as unknown as string[];
  const jours = t('location.joursSemaine', { returnObjects: true }) as unknown as string[];

  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
  const decalage = (premier.getDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
  const cases: (string | null)[] = [
    ...Array<null>(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => versTexte(new Date(mois.getFullYear(), mois.getMonth(), i + 1))),
  ];
  while (cases.length % 7) cases.push(null);
  const moisAvantPossible = mois > new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const toucher = (j: string) => {
    if (!plage) return onChange(j, null);
    if (!debut || fin || j < debut || (j === debut && !memeJour)) return onChange(j, null);
    onChange(debut, j);
  };

  return (
    <View style={styles.cadre}>
      <View style={styles.tete}>
        <Pressable
          onPress={() => moisAvantPossible && setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))}
          disabled={!moisAvantPossible}
          accessibilityRole="button"
          accessibilityLabel={t('location.moisPrecedent')}
          style={[styles.fleche, !moisAvantPossible && { opacity: 0.3 }]}
        >
          <View style={rtl && { transform: [{ scaleX: -1 }] }}>
            <IconeRetour couleur={colors.brun} taille={20} />
          </View>
        </Pressable>
        <Texte variante="titre" poids={700} style={styles.titre}>
          {`${nomsMois[mois.getMonth()]} ${mois.getFullYear()}`}
        </Texte>
        <Pressable
          onPress={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('location.moisSuivant')}
          style={styles.fleche}
        >
          <View style={!rtl && { transform: [{ scaleX: -1 }] }}>
            <IconeRetour couleur={colors.brun} taille={20} />
          </View>
        </Pressable>
      </View>
      <View style={styles.rangee}>
        {jours.map((j, i) => (
          <Texte key={i} poids={700} style={styles.jourSemaine}>
            {j}
          </Texte>
        ))}
      </View>
      <View style={styles.grille}>
        {cases.map((j, i) => {
          if (!j) return <View key={i} style={styles.case} />;
          const passe = j < auj;
          const libre = !disponibilites || estLibre(disponibilites, j, j);
          const inactif = passe || !libre;
          const borne = j === debut || j === fin;
          const dedans = !!debut && !!fin && j > debut && j < fin;
          return (
            <Pressable
              key={i}
              onPress={() => toucher(j)}
              disabled={inactif}
              accessibilityRole="button"
              accessibilityLabel={`${depuisTexte(j).getDate()} ${nomsMois[mois.getMonth()]}`}
              accessibilityState={{ selected: borne, disabled: inactif }}
              style={[styles.case, dedans && styles.dedans, borne && styles.borne]}
            >
              <Texte
                poids={borne ? 700 : 400}
                style={[
                  styles.jour,
                  inactif && { color: colors.sable3, textDecorationLine: libre ? 'none' : 'line-through' },
                  borne && { color: colors.blanc },
                ]}
              >
                {String(depuisTexte(j).getDate())}
              </Texte>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { backgroundColor: colors.carte, borderRadius: 16, padding: 12, gap: 6 },
  tete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fleche: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  titre: { fontSize: 15 },
  rangee: { flexDirection: 'row' },
  jourSemaine: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: colors.brunMoyen },
  grille: { flexDirection: 'row', flexWrap: 'wrap' },
  case: { width: `${100 / 7}%`, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  dedans: { backgroundColor: colors.sable2 },
  borne: { backgroundColor: colors.brun, borderRadius: 12 },
  jour: { fontSize: 14, textAlign: 'center' },
});
