import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { Texte } from '@/components/Texte';
import { useAuth, type ErreurCompte } from '@/lib/auth';
import { colors } from '@/theme';

/** « Supprimer mon compte » (exigé par Apple) : explication, mot de passe, suppression définitive. */
export default function SupprimerCompte() {
  const { t } = useTranslation();
  const { profil, supprimerCompte } = useAuth();
  const [motDePasse, setMotDePasse] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<ErreurCompte | null>(null);
  const [fait, setFait] = useState(false);

  const supprimer = async () => {
    if (!motDePasse || occupe) return;
    setOccupe(true);
    setErreur(null);
    const r = await supprimerCompte(motDePasse);
    setOccupe(false);
    if (r.erreur) return setErreur(r.erreur);
    setFait(true);
  };

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t('supprimerCompte.titre')} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {fait ? (
          <>
            <Texte poids={700} style={{ fontSize: 16 }} accessibilityLiveRegion="polite">
              {t('supprimerCompte.fait')}
            </Texte>
            <Bouton libelle={t('commun.retour')} onPress={() => router.replace('/')} variante="sombre" />
          </>
        ) : profil ? (
          <>
            <View style={styles.alerte}>
              <Texte style={{ fontSize: 14, lineHeight: 21 }}>{t('supprimerCompte.texte')}</Texte>
            </View>
            <Texte style={styles.aide}>{t('supprimerCompte.notes')}</Texte>
            <Champ
              ltr
              libelle={t('supprimerCompte.confirmer')}
              placeholder="••••••••"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
            />
            {erreur && (
              <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
                {t(`compte.erreurs.${erreur}`)}
              </Texte>
            )}
            <Bouton libelle={t('supprimerCompte.bouton')} onPress={supprimer} actif={!!motDePasse} occupe={occupe} variante="danger" />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 14 },
  alerte: { padding: 14, borderRadius: 14, backgroundColor: colors.rougeFond, borderWidth: 1, borderColor: colors.rouge },
  aide: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
});
