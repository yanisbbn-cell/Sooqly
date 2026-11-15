import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, toucheMin } from '@/theme';

import { IconePlus } from './Icones';
import { Texte } from './Texte';

type BoutonProps = TabTriggerSlotProps & { libelle: string; Icone: ComponentType<{ couleur: string }>; pastille?: number };

/** Un onglet classique : icône + libellé, barre d'accent en haut quand il est actif. */
// Les « props » reçues contiennent aussi la « ref » fournie par Expo Router (React 19).
export function BoutonOnglet({ isFocused, libelle, Icone, pastille, ...props }: BoutonProps) {
  const couleurTexte = isFocused ? colors.sable1 : colors.sable3;
  return (
    <Pressable
      {...(props as PressableProps)}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={pastille ? `${libelle} (${pastille})` : libelle}
      style={[styles.onglet, { borderTopColor: isFocused ? colors.accent : 'transparent' }]}
    >
      <View>
        <Icone couleur={isFocused ? colors.accent : colors.sable3} />
        {!!pastille && (
          <View style={styles.compteur}>
            <Texte poids={700} style={styles.compteurTexte}>
              {pastille > 99 ? '99+' : String(pastille)}
            </Texte>
          </View>
        )}
      </View>
      <Texte poids={600} numberOfLines={1} style={[styles.libelle, { color: couleurTexte }]}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Le bouton central « Publier » : pastille d'accent intégrée à la barre, sans dépasser. */
export function BoutonPublier({
  isFocused,
  libelle,
  aria,
  ...props
}: TabTriggerSlotProps & { libelle: string; aria: string }) {
  return (
    <Pressable
      {...(props as PressableProps)}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={aria}
      style={[styles.onglet, { borderTopColor: 'transparent' }]}
    >
      <View style={styles.pastille}>
        <IconePlus couleur={colors.blanc} />
      </View>
      <Texte poids={700} numberOfLines={1} style={[styles.libelle, { color: colors.sable1 }]}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Fond brun de la barre, au-dessus de la zone du geste d'accueil de l'iPhone. */
export function ConteneurBarre({ style, children, ...props }: TabListProps & { children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View {...(props as ViewProps)} style={[styles.barre, { paddingBottom: Math.max(insets.bottom, 12) }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  compteur: {
    position: 'absolute',
    top: -6,
    end: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compteurTexte: { fontSize: 10, color: colors.blanc, textAlign: 'center' },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brun,
    paddingHorizontal: 6,
  },
  onglet: {
    flex: 1,
    height: 64,
    minWidth: toucheMin,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  libelle: { fontSize: 11, textAlign: 'center' },
  pastille: {
    width: 44,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
