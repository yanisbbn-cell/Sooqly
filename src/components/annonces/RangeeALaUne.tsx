import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconeCategorie } from '@/components/IconeCategorie';
import { Texte } from '@/components/Texte';
import { photoPrincipale, type AnnonceResume } from '@/lib/annonces';
import { tarifCourt } from '@/lib/location';
import { urlPhoto } from '@/lib/photos';
import { formaterNombre } from '@/lib/prix';
import type { Categorie } from '@/lib/referentiel';
import { colors } from '@/theme';

import { couleursTuile } from './tuile';

/** Rangée « À la une » : annonces de pros mises en avant, toujours signalées « Sponsorisé ». Jamais de défilement automatique. */
export function RangeeALaUne({ annonces, categories }: { annonces: AnnonceResume[]; categories: Categorie[] | null }) {
  const { t } = useTranslation();
  if (!annonces.length) return null;
  return (
    <View style={{ gap: 10, marginTop: 18 }}>
      <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
        {t('miseEnAvant.alaUne')}
      </Texte>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangee}>
        {annonces.map((a) => {
          const c = categories?.find((x) => x.cle === a.categorie);
          const tuile = couleursTuile(c?.icone ?? 'grid');
          const photo = photoPrincipale(a);
          const tarif = a.type === 'location' ? tarifCourt(a.tarifs ?? []) ?? a.tarifs?.[0] ?? null : null;
          return (
            <Pressable
              key={a.id}
              onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: a.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${a.titre}, ${t('carte.sponsorise')}`}
              style={({ pressed }) => [styles.carte, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.image, { backgroundColor: tuile.fond }]}>
                {photo ? (
                  <Image source={{ uri: urlPhoto(photo) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <IconeCategorie icone={c?.icone ?? 'grid'} couleur={tuile.trait} taille={32} />
                )}
              </View>
              <View style={{ padding: 10, gap: 2 }}>
                <Texte poids={600} style={{ fontSize: 11, color: colors.brunMoyen }}>
                  {t('carte.sponsorise')}
                </Texte>
                <Texte style={{ fontSize: 13 }} numberOfLines={1}>
                  {a.titre}
                </Texte>
                <Texte variante="titre" poids={700} style={{ fontSize: 15 }}>
                  {a.type === 'don' ? t('carte.gratuit') : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t('da')}`}
                  {tarif ? ` ${t(`location.suffixe.${tarif.unite}`)}` : ''}
                </Texte>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titre: { fontSize: 20, paddingHorizontal: 20 },
  rangee: { paddingHorizontal: 20, gap: 12 },
  carte: { width: 170, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.carte, borderWidth: 1.5, borderColor: colors.sable3 },
  image: { height: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
