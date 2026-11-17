import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { usePreferences } from '@/lib/preferences';
import { colors, toucheMin } from '@/theme';

import { IconeCoche } from './Icones';
import { Logo } from './Logo';
import { Texte } from './Texte';

type Props = {
  /** Fermer l'accueil (« Passer » ou « Découvrir sans compte »). */
  onFermer: () => void;
  /** Fermer l'accueil et aller vers la création de compte. */
  onCreerCompte: () => void;
};

/** Illustration de l'écran 1 : une rue de boutiques (aucun être animé). */
function IllustrationVille() {
  const a = colors.accent;
  return (
    <Svg width="100%" height={190} viewBox="0 0 342 190" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={0} y={150} width={342} height={40} rx={8} fill={colors.brunNuit} />
      <Path
        d="M20 150V96h40v54M70 150V70h48v80M128 150V108h34v42M172 150V60l30-22 30 22v90M242 150V90h44v60M296 150V112h30v38"
        fill={colors.brunMoyen}
      />
      <Path d="M202 38v-14" stroke={a} strokeWidth={3} />
      <Circle cx={202} cy={20} r={4} fill={a} />
      <Rect x={86} y={86} width={10} height={12} fill={colors.sable1} opacity={0.6} />
      <Rect x={100} y={86} width={10} height={12} fill={colors.sable1} opacity={0.6} />
      <Rect x={194} y={96} width={16} height={24} rx={8} fill={colors.sable1} opacity={0.6} />
      <Rect x={254} y={104} width={10} height={12} fill={colors.sable1} opacity={0.6} />
      <Path d="M150 168h80" stroke={a} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

function Principe({ texte }: { texte: string }) {
  return (
    <View style={styles.principe}>
      <View style={styles.puce}>
        <IconeCoche couleur={colors.blanc} />
      </View>
      <Texte poids={600} style={styles.principeTexte}>
        {texte}
      </Texte>
    </View>
  );
}

/** Accueil au premier lancement : 3 écrans, points de progression, bouton « Passer ». */
export function AccueilPremierLancement({ onFermer, onCreerCompte }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const derniere = page === 2;

  return (
    <View style={[styles.fond, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
      <View style={styles.haut}>
        <View style={{ direction: 'ltr' }}>
          <Logo taille={24} />
        </View>
        <Pressable onPress={onFermer} accessibilityRole="button" style={styles.passer}>
          <Texte poids={600} style={styles.passerTexte}>
            {t('accueil.passer')}
          </Texte>
        </Pressable>
      </View>

      <ScrollView style={styles.milieu} contentContainerStyle={styles.milieuContenu}>
        {page === 0 && (
          <>
            <IllustrationVille />
            <View style={styles.bloc}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {t('accueil.t1')}
              </Texte>
              <Texte style={styles.sousTitre}>{t('accueil.s1')}</Texte>
            </View>
          </>
        )}

        {page === 1 && (
          <>
            <View style={styles.bloc}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {t('accueil.t2')}
              </Texte>
              <Texte style={styles.sousTitre}>{t('accueil.s2')}</Texte>
            </View>
            <View style={styles.principes}>
              <Principe texte={t('accueil.p1')} />
              <Principe texte={t('accueil.p2')} />
              <Principe texte={t('accueil.p3')} />
              <Principe texte={t('accueil.p4')} />
            </View>
            {/* Bordure du côté où commence la lecture : à gauche en français, à droite en arabe. */}
            <View style={[styles.verset, rtl ? styles.versetDroite : styles.versetGauche]}>
              <Texte variante="coran" style={styles.versetTexte}>
                {t('accueil.verset')}
              </Texte>
            </View>
          </>
        )}

        {page === 2 && (
          <>
            <View style={styles.medailleFond}>
              <View style={styles.medaille}>
                <IconeCoche couleur={colors.blanc} taille={44} epaisseur={2.6} />
              </View>
            </View>
            <View style={styles.bloc}>
              <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
                {t('accueil.t3')}
              </Texte>
              <Texte style={styles.sousTitre}>{t('accueil.s3')}</Texte>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bas}>
        <View style={styles.points} accessibilityLabel={t('accueil.progression', { n: page + 1 })}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.point,
                { width: i === page ? 22 : 8, backgroundColor: i === page ? colors.accent : colors.brunMoyen },
              ]}
            />
          ))}
        </View>

        {derniere ? (
          <>
            <Pressable onPress={onCreerCompte} accessibilityRole="button" style={styles.boutonPrincipal}>
              <Texte poids={700} style={styles.boutonPrincipalTexte}>
                {t('accueil.creerCompte')}
              </Texte>
            </Pressable>
            <Pressable onPress={onFermer} accessibilityRole="button" style={styles.boutonSecondaire}>
              <Texte poids={700} style={styles.boutonSecondaireTexte}>
                {t('accueil.decouvrir')}
              </Texte>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => setPage(page + 1)} accessibilityRole="button" style={styles.boutonPrincipal}>
            <Texte poids={700} style={styles.boutonPrincipalTexte}>
              {t('accueil.suivant')}
            </Texte>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { ...StyleSheet.absoluteFill, zIndex: 20, backgroundColor: colors.brun },
  haut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  passer: { minHeight: toucheMin, minWidth: toucheMin, paddingHorizontal: 12, justifyContent: 'center' },
  passerTexte: { color: colors.sable3, fontSize: 14, textAlign: 'center' },
  milieu: { flex: 1 },
  milieuContenu: { flexGrow: 1, justifyContent: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  bloc: { gap: 10 },
  titre: { fontSize: 28, lineHeight: 34, color: colors.sable1 },
  sousTitre: { fontSize: 15, lineHeight: 24, color: colors.sable2 },
  principes: { gap: 12 },
  principe: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  puce: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principeTexte: { flex: 1, fontSize: 15, color: colors.sable1 },
  verset: { borderColor: colors.accent },
  versetGauche: { borderLeftWidth: 3, paddingLeft: 12 },
  versetDroite: { borderRightWidth: 3, paddingRight: 12 },
  versetTexte: { fontSize: 16, lineHeight: 29, color: colors.sable3 },
  medailleFond: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brunNuit,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medaille: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.vert,
    borderWidth: 2,
    borderColor: colors.brun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bas: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 14 },
  points: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  point: { height: 8, borderRadius: 4 },
  boutonPrincipal: {
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPrincipalTexte: { color: colors.blanc, fontSize: 18, textAlign: 'center' },
  boutonSecondaire: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sable3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonSecondaireTexte: { color: colors.sable1, fontSize: 15, textAlign: 'center' },
});
