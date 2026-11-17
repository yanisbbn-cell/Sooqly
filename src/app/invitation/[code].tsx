import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { EtatChargement } from '@/components/EtatChargement';
import { colors } from '@/theme';

/**
 * Anciens liens d'invitation (https://…/invitation/CODE, avant la décision du 17 novembre 2026) :
 * le parrainage par code n'existe plus, le lien ouvre simplement l'accueil.
 */
export default function Invitation() {
  useEffect(() => {
    router.replace('/');
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.blanc }}>
      <EtatChargement erreur={false} reessayer={() => {}} />
    </View>
  );
}
