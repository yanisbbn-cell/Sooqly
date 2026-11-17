import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { IconeCoche, IconePlus } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { useDetecteur } from '@/lib/detecteur';
import { appareilDisponible, conseilsPhoto, MAX_PHOTOS, preparer, prendrePhoto, type PhotoLocale, type Source } from '@/lib/photos';
import { colors, toucheMin } from '@/theme';

type Props = {
  angles: string[];
  photos: PhotoLocale[];
  setPhotos: (f: (p: PhotoLocale[]) => PhotoLocale[]) => void;
};

/** Étape « Photos » : 10 cases avec l'angle conseillé ; chaque photo passe au détecteur avant d'être gardée. */
export function EtapePhotos({ angles, photos, setPhotos }: Props) {
  const { t } = useTranslation();
  const detecteur = useDetecteur();
  const [choix, setChoix] = useState<number | null>(null);
  const [erreur, setErreur] = useState(false);

  const principale = photos[0]?.emplacement;
  const n = photos.length;
  const refusee = photos.some((p) => p.analyse?.interdit);
  // Conseils (jamais bloquants) : photo petite ou prise en hauteur, avec l'angle concerné.
  const conseils = [...photos]
    .sort((x, y) => x.emplacement - y.emplacement)
    .flatMap((p) => conseilsPhoto(p).map((c) => ({ c, angle: angles[p.emplacement] ?? '' })));

  const ajouter = async (emplacement: number, source: Source) => {
    setChoix(null);
    setErreur(false);
    try {
      const uri = await prendrePhoto(source);
      if (!uri) return;
      const prete = await preparer(uri);
      setPhotos((liste) => [...liste.filter((p) => p.emplacement !== emplacement), { emplacement, uri: prete.uri, base64: prete.base64, analyse: null, largeur: prete.largeur, hauteur: prete.hauteur }]);
      const analyse = await detecteur.analyser(prete.petite);
      setPhotos((liste) => liste.map((p) => (p.emplacement === emplacement && p.uri === prete.uri ? { ...p, analyse } : p)));
    } catch {
      setErreur(true);
    }
  };

  const retirer = (emplacement: number) => setPhotos((liste) => liste.filter((p) => p.emplacement !== emplacement));

  return (
    <View style={{ gap: 14 }}>
      <Pressable
        onPress={() => router.push('/guide-photo')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.guide, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Texte poids={700} style={{ fontSize: 15 }}>
            {t('photos.guideCarte')}
          </Texte>
          <Texte style={styles.aide}>{t('photos.guideCarteSous')}</Texte>
        </View>
        <Texte poids={700} style={{ fontSize: 20, color: colors.accentFonce }}>
          ›
        </Texte>
      </Pressable>

      <View style={styles.tete}>
        <Texte variante="titre" poids={700} style={{ fontSize: 16, flex: 1 }}>
          {t('photos.titre')}
        </Texte>
        <Texte
          poids={700}
          style={{ fontSize: 14, writingDirection: 'ltr', color: n >= 4 ? colors.vert : n ? colors.accentFonce : colors.brunMoyen }}
        >
          {n} / {MAX_PHOTOS}
        </Texte>
      </View>
      <Texte style={styles.aide}>{t(n === 0 ? 'photos.aucune' : n < 4 ? 'photos.peu' : 'photos.assez')}</Texte>

      {!detecteur.pret && !detecteur.indisponible && (
        <View style={styles.info}>
          <ActivityIndicator color={colors.brunMoyen} size="small" />
          <Texte style={[styles.aide, { flex: 1 }]}>{t('photos.detecteurAttente')}</Texte>
        </View>
      )}
      {detecteur.indisponible && <Texte style={[styles.aide, styles.info]}>{t('photos.detecteurIndispo')}</Texte>}

      {refusee && (
        <View style={styles.alerte} accessibilityRole="alert">
          <Texte poids={600} style={styles.alerteTexte}>
            {t('photos.refusee')}
          </Texte>
        </View>
      )}
      {erreur && (
        <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }}>
          {t('photos.erreurPhoto')}
        </Texte>
      )}
      {conseils.length > 0 && (
        <View style={styles.conseils}>
          {conseils.map(({ c, angle }, k) => (
            <Texte key={k} style={styles.conseilTexte}>
              {t(c === 'petite' ? 'photos.conseilPetite' : 'photos.conseilVerticale', { angle })}
            </Texte>
          ))}
        </View>
      )}

      <View style={styles.grille}>
        {angles.slice(0, MAX_PHOTOS).map((angle, i) => {
          const p = photos.find((x) => x.emplacement === i);
          const mauvaise = !!p?.analyse?.interdit;
          return (
            <View key={i} style={styles.case}>
              <Pressable
                onPress={() => (p ? retirer(i) : setChoix(choix === i ? null : i))}
                accessibilityRole="button"
                accessibilityLabel={p ? t('photos.enlever', { angle }) : t('photos.ajouter', { angle })}
                style={[
                  styles.vignette,
                  p ? styles.vignettePleine : styles.vignetteVide,
                  mauvaise && { borderColor: colors.rouge, borderWidth: 3 },
                  choix === i && { borderColor: colors.accent, borderStyle: 'solid', borderWidth: 2 },
                ]}
              >
                {p ? (
                  <>
                    <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    {!p.analyse && (
                      <View style={styles.voile}>
                        <ActivityIndicator color={colors.blanc} />
                      </View>
                    )}
                    {mauvaise && (
                      <View style={[styles.marque, { backgroundColor: colors.rouge }]}>
                        <Texte poids={700} style={styles.marqueTexte}>
                          {t('photos.refuseeCase')}
                        </Texte>
                      </View>
                    )}
                    {!mauvaise && principale === i && (
                      <View style={styles.marque}>
                        <Texte poids={700} style={styles.marqueTexte}>
                          {t('photos.principale')}
                        </Texte>
                      </View>
                    )}
                  </>
                ) : (
                  <IconePlus couleur={colors.brunMoyen} taille={22} />
                )}
              </Pressable>
              <Texte style={styles.angle} numberOfLines={2}>
                {angle}
              </Texte>
            </View>
          );
        })}
      </View>

      {choix !== null && (
        <View style={styles.choix}>
          <Texte poids={700} style={{ fontSize: 15 }}>
            {angles[choix]}
          </Texte>
          {/* Les règles d'or, juste avant de prendre la photo. */}
          <View style={styles.regles}>
            {(t('photos.reglesOr', { returnObjects: true }) as unknown as string[]).map((r, k) => (
              <View key={k} style={styles.regle}>
                <View style={styles.puce}>
                  <IconeCoche couleur={colors.blanc} taille={11} />
                </View>
                <Texte style={styles.regleTexte}>{r}</Texte>
              </View>
            ))}
          </View>
          {appareilDisponible() && <Bouton libelle={t('photos.appareil')} onPress={() => ajouter(choix, 'camera')} variante="sombre" />}
          <Bouton libelle={t('photos.galerie')} onPress={() => ajouter(choix, 'galerie')} variante="sombre" />
          <Bouton libelle={t('photos.annuler')} onPress={() => setChoix(null)} variante="contour" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.carte,
    borderWidth: 1,
    borderColor: colors.sable2,
  },
  tete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.sable1 },
  alerte: { backgroundColor: colors.rougeFond, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.rouge },
  alerteTexte: { fontSize: 13, lineHeight: 19, color: colors.rouge },
  grille: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  case: { width: '33.33%', padding: 5, gap: 4 },
  // Format des cartes (4:3) : le vendeur voit sa photo cadrée comme dans la liste des annonces.
  vignette: {
    aspectRatio: 4 / 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: toucheMin,
  },
  vignetteVide: { backgroundColor: colors.carte, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.sable4 },
  vignettePleine: { backgroundColor: colors.sable2, borderWidth: 2, borderColor: colors.brun },
  voile: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(42,32,24,0.45)', alignItems: 'center', justifyContent: 'center' },
  marque: { position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: colors.brun, paddingVertical: 2 },
  marqueTexte: { fontSize: 11, color: colors.blanc, textAlign: 'center' },
  angle: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  conseils: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: colors.sable1, borderWidth: 1, borderColor: colors.sable3 },
  conseilTexte: { fontSize: 13, lineHeight: 19 },
  regles: { gap: 6, paddingVertical: 4 },
  regle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  puce: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.vert, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  regleTexte: { flex: 1, fontSize: 13, lineHeight: 19 },
  choix: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.carte, borderWidth: 1, borderColor: colors.sable2 },
});
