import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Barres de la forme d'onde ; la partie déjà écoutée est colorée (comme Telegram). Toucher = se déplacer. */
export function FormeOnde({
  barres,
  progression = 0,
  couleurLue,
  couleurRestante,
  hauteur = 28,
  onChercher,
  etiquette,
}: {
  barres: number[];
  progression?: number;
  couleurLue: string;
  couleurRestante: string;
  hauteur?: number;
  onChercher?: (fraction: number) => void;
  etiquette?: string;
}) {
  const [largeur, setLargeur] = useState(0);
  // Sans forme d'onde enregistrée (ancien vocal) : des barres régulières.
  const valeurs = barres.length ? barres : Array.from({ length: 32 }, (_, i) => 30 + ((i * 37) % 40));
  const contenu = (
    <View style={[styles.rangee, { height: hauteur, direction: 'ltr' }]}>
      {valeurs.map((v, i) => (
        <View
          key={i}
          style={[
            styles.barre,
            {
              height: Math.max(3, (v / 100) * hauteur),
              backgroundColor: (i + 0.5) / valeurs.length <= progression ? couleurLue : couleurRestante,
            },
          ]}
        />
      ))}
    </View>
  );
  if (!onChercher) return contenu;
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={etiquette}
      onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}
      onPress={(e) => {
        if (largeur) onChercher(Math.max(0, Math.min(1, e.nativeEvent.locationX / largeur)));
      }}
      style={{ flex: 1 }}
    >
      {contenu}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' },
  barre: { flex: 1, borderRadius: 2, minWidth: 2 },
});
