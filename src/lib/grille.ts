import { useWindowDimensions } from 'react-native';

/**
 * Grille des cartes d'annonces : 2 colonnes sur téléphone, 3 sur tablette, 4 sur grand écran.
 * Renvoie le nombre de colonnes et la largeur d'une carte (marges et espaces déduits).
 */
export function useGrille(marge = 20, espace = 12) {
  const { width } = useWindowDimensions();
  const colonnes = width < 600 ? 2 : width < 1000 ? 3 : 4;
  const largeur = Math.floor((width - marge * 2 - espace * (colonnes - 1)) / colonnes);
  return { colonnes, largeur, espace };
}
