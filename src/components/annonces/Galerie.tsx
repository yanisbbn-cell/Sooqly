import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import type { PhotoAnnonce } from '@/lib/annonces';
import { urlPhoto } from '@/lib/photos';
import { colors } from '@/theme';

/** Photos d'une annonce, à faire défiler. Pour la modération : le résultat du détecteur sur chaque photo. */
export function Galerie({ photos, hauteur, moderation }: { photos: PhotoAnnonce[]; hauteur: number; moderation?: boolean }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const triees = [...photos].sort((a, b) => a.ordre - b.ordre);

  return (
    <View style={{ height: hauteur }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={64}
      >
        {triees.map((p) => {
          const d = p.resultat_detecteur?.detail;
          return (
            <View key={p.fichier} style={{ width, height: hauteur }}>
              <Image
                source={{ uri: urlPhoto(p.fichier) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel={p.angle ?? undefined}
              />
              {moderation && (
                <View style={[styles.detecteur, { backgroundColor: d?.interdit ? colors.rouge : d && !d.erreur ? colors.vert : colors.brun }]}>
                  <Texte poids={700} style={styles.detecteurTexte}>
                    {d?.interdit
                      ? t('moderation.detecteurAlerte', {
                          objets: (d.objets ?? []).map((o) => `${o.classe} ${Math.round(o.score * 100)} %`).join(', '),
                        })
                      : d && !d.erreur
                        ? t('moderation.detecteurRien')
                        : t('moderation.detecteurInconnu')}
                    {p.decision_moderation !== 'en_attente' ? ` · ${t(`moderation.photo_${p.decision_moderation}`)}` : ''}
                  </Texte>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      {triees.length > 1 && (
        <View style={styles.compteur}>
          <Texte poids={700} style={{ color: colors.sable1, fontSize: 12, writingDirection: 'ltr' }}>
            {index + 1} / {triees.length}
          </Texte>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  detecteur: { position: 'absolute', start: 12, end: 12, bottom: 44, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  detecteurTexte: { fontSize: 12, color: colors.blanc },
  compteur: {
    position: 'absolute',
    bottom: 12,
    end: 12,
    backgroundColor: 'rgba(59,45,34,0.88)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
