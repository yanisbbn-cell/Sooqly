import { Text, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme';

/** Logo « Sooq » + « ly » en couleur d'accent. Toujours écrit de gauche à droite. */
export function Logo({ taille = 28, couleur = colors.sable1 }: { taille?: number; couleur?: string }) {
  const style: TextStyle = {
    fontFamily: fonts.titre[700],
    fontSize: taille,
    letterSpacing: -0.5,
    color: couleur,
    writingDirection: 'ltr',
    lineHeight: taille * 1.15,
  };
  return (
    <Text style={style} accessibilityRole="header" accessibilityLabel="Sooqly">
      Sooq<Text style={{ color: colors.accent }}>ly</Text>
    </Text>
  );
}
