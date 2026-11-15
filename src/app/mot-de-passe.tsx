import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { Texte } from '@/components/Texte';
import { MOT_DE_PASSE_MIN, useAuth, type ErreurCompte } from '@/lib/auth';
import { colors } from '@/theme';

/** Changer son mot de passe : l'ancien, puis le nouveau deux fois. */
export default function ChangerMotDePasse() {
  const { t } = useTranslation();
  const { changerMotDePasse } = useAuth();
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<ErreurCompte | null>(null);
  const [reussi, setReussi] = useState(false);

  const different = confirmation.length > 0 && confirmation !== nouveau;
  const pret = ancien.length > 0 && nouveau.length >= MOT_DE_PASSE_MIN && confirmation === nouveau;

  const enregistrer = async () => {
    if (!pret || occupe) return;
    setOccupe(true);
    setErreur(null);
    const r = await changerMotDePasse(ancien, nouveau);
    setOccupe(false);
    if (r.erreur) return setErreur(r.erreur);
    setReussi(true);
    setAncien('');
    setNouveau('');
    setConfirmation('');
  };

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t('motDePasse.titre')} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {reussi && (
          <View style={styles.reussi} accessibilityLiveRegion="polite">
            <Texte poids={700} style={{ fontSize: 14, color: colors.vert }}>
              {t('motDePasse.reussi')}
            </Texte>
          </View>
        )}
        <Champ ltr libelle={t('motDePasse.ancien')} value={ancien} onChangeText={setAncien} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
        <View style={{ gap: 6 }}>
          <Champ ltr libelle={t('motDePasse.nouveau')} value={nouveau} onChangeText={setNouveau} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
          <Texte style={styles.aide}>{t('motDePasse.aide')}</Texte>
        </View>
        <Champ
          ltr
          libelle={t('motDePasse.confirmer')}
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={enregistrer}
        />
        {different && (
          <Texte poids={600} style={styles.erreur}>
            {t('motDePasse.different')}
          </Texte>
        )}
        {erreur && (
          <Texte poids={600} style={styles.erreur} accessibilityLiveRegion="polite">
            {t(`compte.erreurs.${erreur}`)}
          </Texte>
        )}
        <Bouton libelle={t('motDePasse.enregistrer')} onPress={enregistrer} actif={pret} occupe={occupe} grand />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 16 },
  aide: { fontSize: 12, color: colors.brunMoyen },
  erreur: { fontSize: 13, color: colors.rouge },
  reussi: { padding: 12, borderRadius: 12, backgroundColor: colors.vertFond, borderWidth: 1, borderColor: colors.vertBord },
});
