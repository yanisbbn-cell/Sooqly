import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { IconeCategorie } from '@/components/IconeCategorie';

import { couleursTuile } from './tuile';

/** Étoile à 8 branches (deux carrés croisés), motif des zelliges, centrée dans une case de 32 × 32. */
const ETOILE = 'M16 5l3.2 7.8L27 16l-7.8 3.2L16 27l-3.2-7.8L5 16l7.8-3.2z';
const LOSANGES = 'M0 0l3 3-3 3-3-3zM32 0l3 3-3 3-3-3zM0 32l3-3 3 3-3 3zM32 32l3-3 3 3-3 3z';

/**
 * Vignette d'une annonce sans photo : fond clair de la catégorie, motif géométrique discret (zellige),
 * halo et icône de la catégorie au centre. Aucun être animé.
 */
export function VignetteSansPhoto({ icone, tailleIcone = 40 }: { icone: string; tailleIcone?: number }) {
  const c = couleursTuile(icone);
  // Même motif pour toutes les vignettes d'une catégorie : l'identifiant peut être partagé sans conflit.
  const motif = `zellige-${icone.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const halo = tailleIcone * 2.1;
  return (
    <View style={[StyleSheet.absoluteFill, styles.centre, { backgroundColor: c.fond }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={motif} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <G fill="none" stroke={c.a} strokeWidth={1} strokeOpacity={0.16} strokeLinejoin="round">
              <Path d={ETOILE} />
              <Rect x={11.5} y={11.5} width={9} height={9} transform="rotate(45 16 16)" />
            </G>
            <Path d={LOSANGES} fill={c.a} fillOpacity={0.1} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${motif})`} />
      </Svg>
      <View style={[styles.halo, { width: halo, height: halo, borderRadius: halo / 2, backgroundColor: c.fond }]}>
        <IconeCategorie icone={icone} couleur={c.trait} taille={tailleIcone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    boxShadow: '0px 2px 8px rgba(59, 45, 34, 0.12)',
  },
});
