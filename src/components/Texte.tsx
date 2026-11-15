import { Text, type TextProps } from 'react-native';

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

  return (
    <Text
      {...props}
      style={[
        { fontFamily, color: colors.brun, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' },
        style,
      ]}
    />
  );
}
