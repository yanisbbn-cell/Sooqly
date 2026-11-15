import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { usePreferences } from '@/lib/preferences';
import { colors, fonts } from '@/theme';

import { Texte } from './Texte';

/** Petit titre au-dessus d'un champ. */
export function Libelle({ children }: { children: ReactNode }) {
  return (
    <Texte poids={600} style={styles.libelle}>
      {children}
    </Texte>
  );
}

type Props = TextInputProps & {
  libelle?: string;
  /** Force l'écriture de gauche à droite (numéros, codes). */
  ltr?: boolean;
};

/** Champ de saisie de Sooqly, avec son libellé. */
export function Champ({ libelle, ltr, style, ...props }: Props) {
  const { rtl } = usePreferences();
  const droite = rtl && !ltr;
  return (
    <View style={styles.bloc}>
      {libelle ? <Libelle>{libelle}</Libelle> : null}
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={colors.brunMoyen}
        {...props}
        style={[
          styles.champ,
          {
            fontFamily: droite ? fonts.arabe[400] : fonts.texte[400],
            textAlign: droite ? 'right' : 'left',
            writingDirection: droite ? 'rtl' : 'ltr',
          },
          style,
        ]}
      />
    </View>
  );
}

export const styleChamp = {
  height: 48,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.sable3,
  backgroundColor: colors.carte,
  paddingHorizontal: 14,
} as const;

const styles = StyleSheet.create({
  bloc: { gap: 6, flexShrink: 1, flexGrow: 1 },
  libelle: { fontSize: 13 },
  champ: { ...styleChamp, fontSize: 15, color: colors.brun, minWidth: 0 },
});
