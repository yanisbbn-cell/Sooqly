import { Pressable, StyleSheet } from 'react-native';

import { colors, toucheMin } from '@/theme';

import { Texte } from './Texte';

/** Petit bouton à choisir (« pastille ») : brun quand il est choisi. */
export function Pastille({
  libelle,
  choisi,
  onPress,
  largeur,
}: {
  libelle: string;
  choisi: boolean;
  onPress: () => void;
  /** Prend toute la largeur disponible dans une rangée. */
  largeur?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: choisi }}
      style={({ pressed }) => [styles.pastille, largeur && { flex: 1 }, choisi && styles.choisie, pressed && { opacity: 0.8 }]}
    >
      <Texte poids={600} style={[styles.texte, choisi && { color: colors.sable1 }]}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pastille: {
    minHeight: toucheMin,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choisie: { backgroundColor: colors.brun, borderColor: colors.brun },
  texte: { fontSize: 13, textAlign: 'center' },
});
