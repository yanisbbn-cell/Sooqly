import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { colors, fonts } from '@/theme';

type Props = TextProps & {
  /** titre = Space Grotesk, texte = Inter, coran = Amiri. En arabe : IBM Plex Sans Arabic (sauf Coran). */
  variante?: 'titre' | 'texte' | 'coran';
  poids?: 400 | 600 | 700;
};

/** Texte de Sooqly : choisit la bonne police et le bon sens d'écriture selon la langue. */
export function Texte({ variante = 'texte', poids = 400, style, ...props }: Props) {
  const { rtl } = usePreferences();

  let fontFamily: string;
  if (variante === 'coran') {
    fontFamily = poids >= 700 ? fonts.coran[700] : fonts.coran[400];
  } else if (rtl) {
    fontFamily = fonts.arabe[poids];
  } else if (variante === 'titre') {
    fontFamily = poids >= 700 ? fonts.titre[700] : fonts.titre[600];
  } else {
    fontFamily = fonts.texte[poids];
  }

  // Finitions des titres (latin) : lettres un peu resserrées sur les grandes tailles, chiffres de même largeur
  // (les prix s'alignent et ne « dansent » pas). Un style explicite reste prioritaire.
  let finition: TextStyle | null = null;
  if (variante === 'titre' && !rtl) {
    const taille = StyleSheet.flatten(style)?.fontSize ?? 14;
    finition = { fontVariant: ['tabular-nums'], letterSpacing: taille >= 20 ? -0.4 : taille >= 16 ? -0.2 : 0 };
  }

  return (
    <Text
      {...props}
      style={[
        { fontFamily, color: colors.brun, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' },
        finition,
        style,
      ]}
    />
  );
}
