import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { EtatChargement } from '@/components/EtatChargement';
import { cles, ecrire } from '@/lib/stockage';
import { colors } from '@/theme';

/**
 * Lien d'invitation (parrainage) : https://…/invitation/CODE.
 * Le code est gardé sur l'appareil, puis l'écran Compte s'ouvre sur l'inscription avec le code déjà rempli.
 */
export default function Invitation() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => {
    const propre = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    (propre ? ecrire(cles.parrain, propre) : Promise.resolve()).then(() => router.replace('/compte'));
  }, [code]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.blanc }}>
      <EtatChargement erreur={false} reessayer={() => {}} />
    </View>
  );
}
