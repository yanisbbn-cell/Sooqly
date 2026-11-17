import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FILTRES_VIDES, useRecherche } from '@/lib/recherche';
import { toucheMin } from '@/theme';

import { Logo } from './Logo';

/** Logo cliquable : retour à l'accueil en un appui, recherche et tri remis à zéro. */
export function LogoAccueil({ taille }: { taille?: number }) {
  const { t } = useTranslation();
  const { setFiltres, setTri } = useRecherche();
  return (
    <Pressable
      onPress={() => {
        setFiltres(FILTRES_VIDES);
        setTri('recent');
        router.navigate('/');
      }}
      accessibilityRole="link"
      accessibilityLabel={t('app.retourAccueil')}
      hitSlop={8}
      // Le logo s'écrit toujours de gauche à droite, même en arabe.
      style={({ pressed }) => [{ alignSelf: 'flex-start', direction: 'ltr', minHeight: toucheMin, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}
    >
      <Logo taille={taille} />
    </Pressable>
  );
}
