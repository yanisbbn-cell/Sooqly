import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, toucheMin } from '@/theme';

import { Texte } from './Texte';

type Props = {
  libelle: string;
  onPress: () => void;
  /** Faux : bouton grisé (action impossible pour l'instant). */
  actif?: boolean;
  occupe?: boolean;
  variante?: 'accent' | 'sombre' | 'contour';
  grand?: boolean;
};

/** Bouton d'action de Sooqly. Accent = agir ; sombre = action secondaire ; contour = retour. */
export function Bouton({ libelle, onPress, actif = true, occupe, variante = 'accent', grand }: Props) {
  const fond = !actif ? colors.inactif : variante === 'sombre' ? colors.brun : variante === 'contour' ? 'transparent' : colors.accent;
  const couleur = !actif ? colors.brunMoyen : variante === 'sombre' ? colors.sable1 : variante === 'contour' ? colors.brun : colors.blanc;
  return (
    <Pressable
      onPress={onPress}
      disabled={!actif || occupe}
      accessibilityRole="button"
      accessibilityState={{ disabled: !actif, busy: occupe }}
      style={({ pressed }) => [
        styles.bouton,
        grand && styles.grand,
        { backgroundColor: fond },
        variante === 'contour' && actif && styles.contour,
        pressed && { opacity: 0.8 },
      ]}
    >
      {occupe ? (
        <ActivityIndicator color={couleur} />
      ) : (
        <Texte poids={700} style={{ color: couleur, fontSize: grand ? 17 : 15, textAlign: 'center' }}>
          {libelle}
        </Texte>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: toucheMin + 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  grand: { minHeight: 56, borderRadius: 14 },
  contour: { borderWidth: 1.5, borderColor: colors.sable4 },
});
