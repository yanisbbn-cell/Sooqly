import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconeEtoile } from '@/components/Icones';
import { colors } from '@/theme';

type Props = {
  valeur: number;
  /** Absent : étoiles en lecture seule. */
  onChoisir?: (n: number) => void;
  taille?: number;
  /** Largeur de la zone tactile de chaque étoile (44 px minimum). */
  zone?: number;
};

/** Cinq étoiles, toujours de gauche à droite (même en arabe), comme dans la maquette. */
export function Etoiles({ valeur, onChoisir, taille = 20, zone = 44 }: Props) {
  const { t } = useTranslation();
  return (
    <View
      style={{ flexDirection: 'row', direction: 'ltr', gap: onChoisir ? 0 : 2 }}
      accessibilityRole={onChoisir ? undefined : 'image'}
      accessibilityLabel={onChoisir ? undefined : t('confiance.etoile', { count: valeur })}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const etoile = <IconeEtoile couleur={i <= valeur ? colors.accent : colors.sable4} pleine={i <= valeur} taille={taille} />;
        return onChoisir ? (
          <Pressable
            key={i}
            onPress={() => onChoisir(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: i <= valeur }}
            accessibilityLabel={t('confiance.etoile', { count: i })}
            style={{ width: zone, height: zone, alignItems: 'center', justifyContent: 'center' }}
          >
            {etoile}
          </Pressable>
        ) : (
          <View key={i}>{etoile}</View>
        );
      })}
    </View>
  );
}
