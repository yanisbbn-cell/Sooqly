import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EcranProvisoire } from '@/components/EcranProvisoire';
import { EtatChargement } from '@/components/EtatChargement';
import { AssistantPublication } from '@/components/publier/AssistantPublication';
import { useAuth } from '@/lib/auth';
import { DetecteurProvider } from '@/lib/detecteur';
import { colors } from '@/theme';

/** Onglet Publier : l'assistant pour un membre connecté, sinon une invitation à se connecter. */
export default function Publier() {
  const { t } = useTranslation();
  const { pret, profil } = useAuth();
  if (!pret) {
    return (
      <View style={styles.attente}>
        <EtatChargement erreur={false} reessayer={() => {}} />
      </View>
    );
  }
  if (!profil) {
    return (
      <EcranProvisoire titre={t('publier.titre')} texte={t('publier.connexionRequise')}>
        <Bouton libelle={t('publier.connexionBouton')} onPress={() => router.navigate('/compte')} />
      </EcranProvisoire>
    );
  }
  // La clé remet l'assistant à zéro si un autre membre se connecte.
  // Le détecteur de photos se prépare dès l'ouverture de l'assistant.
  return (
    <DetecteurProvider>
      <AssistantPublication key={profil.id} profil={profil} />
    </DetecteurProvider>
  );
}

const styles = StyleSheet.create({
  attente: { flex: 1, backgroundColor: colors.blanc, justifyContent: 'center' },
});
