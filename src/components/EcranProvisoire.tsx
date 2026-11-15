import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { EnTete } from './EnTete';
import { Texte } from './Texte';

/** Écran provisoire de l'étape 1 : en-tête, titre et phrase « arrive à l'étape N ». */
export function EcranProvisoire({ titre, texte, children }: { titre: string; texte: string; children?: ReactNode }) {
  return (
    <View style={styles.ecran}>
      <EnTete />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
          {titre}
        </Texte>
        <View style={styles.carte}>
          <Texte style={styles.texte}>{texte}</Texte>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 16 },
  titre: { fontSize: 24 },
  carte: { backgroundColor: colors.carte, borderRadius: 16, padding: 16 },
  texte: { fontSize: 15, lineHeight: 22, color: colors.brunMoyen },
});
