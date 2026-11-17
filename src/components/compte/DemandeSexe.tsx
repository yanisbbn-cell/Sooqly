import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { ChoixSexe } from '@/components/compte/ChoixSexe';
import { Texte } from '@/components/Texte';
import { useAuth, type Sexe } from '@/lib/auth';
import { colors } from '@/theme';

/**
 * Membres inscrits avant la règle des cours particuliers : une seule question, à la prochaine ouverture.
 * Tant qu'elle n'a pas de réponse, les cours « lycée et adultes » restent invisibles pour ce membre.
 */
export function DemandeSexe() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil, definirSexe } = useAuth();
  const [choix, setChoix] = useState<Sexe | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  if (!profil || profil.sexe || profil.sexeInconnu) return null;

  const valider = async () => {
    if (!choix) return;
    setOccupe(true);
    setErreur(false);
    const r = await definirSexe(choix);
    setOccupe(false);
    setErreur(!!r.erreur);
  };

  return (
    <View style={styles.voile} accessibilityViewIsModal>
      <View style={[styles.carte, { marginTop: insets.top + 40 }]}>
        <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
          {t('sexe.titreDemande')}
        </Texte>
        <Texte style={{ fontSize: 14, lineHeight: 21, color: colors.brunMoyen }}>{t('sexe.texteDemande')}</Texte>
        <ChoixSexe valeur={choix} onChoisir={setChoix} />
        {erreur && (
          <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
            {t('sexe.erreur')}
          </Texte>
        )}
        <Bouton libelle={t('sexe.valider')} onPress={valider} actif={!!choix} occupe={occupe} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  voile: { ...StyleSheet.absoluteFill, zIndex: 15, backgroundColor: 'rgba(42, 32, 24, 0.75)', paddingHorizontal: 20, alignItems: 'center' },
  carte: { width: '100%', maxWidth: 440, padding: 20, borderRadius: 20, backgroundColor: colors.blanc, gap: 14 },
});
