import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconeCategorie } from '@/components/IconeCategorie';
import { Texte } from '@/components/Texte';
import { BadgeValide } from '@/components/confiance/BadgeValide';
import { useVendeurValide } from '@/lib/confiance';
import { estSponsorisee, photoPrincipale, type AnnonceResume } from '@/lib/annonces';
import { tarifCourt, type Tarif } from '@/lib/location';
import { urlPhoto } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { formaterEuro, formaterNombre } from '@/lib/prix';
import type { Categorie, Wilaya } from '@/lib/referentiel';
import { colors } from '@/theme';

import { couleursTuile } from './tuile';

type Props = {
  annonce: AnnonceResume;
  categorie: Categorie | undefined;
  wilaya: Wilaya | undefined;
  taux: number;
};

/** Carte d'une annonce dans la liste (deux par rangée). */
export function CarteAnnonce({ annonce: a, categorie, wilaya, taux }: Props) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const tuile = couleursTuile(categorie?.icone ?? 'grid');
  const don = a.type === 'don';
  const lieu = a.ville || (wilaya ? (langue === 'ar' ? wilaya.nom_ar : wilaya.nom_fr) : '');
  const sponsorisee = estSponsorisee(a);
  const valide = useVendeurValide(a.auteur?.id);
  // Location : le plus petit tarif (par nuit ou par jour, sinon semaine, mois…).
  const tarif: Tarif | null = a.type === 'location' ? (tarifCourt(a.tarifs ?? []) ?? premierTarif(a.tarifs ?? [])) : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: a.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${a.titre}, ${don ? t('carte.gratuit') : `${formaterNombre(a.prix_da)} ${t('da')}`}`}
      style={({ pressed }) => [styles.carte, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.tuile, { backgroundColor: tuile.fond }]}>
        {photoPrincipale(a) ? (
          <Image source={{ uri: urlPhoto(photoPrincipale(a)!) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <IconeCategorie icone={categorie?.icone ?? 'grid'} couleur={tuile.trait} taille={40} />
        )}
        <View style={styles.type}>
          <Texte poids={600} style={styles.typeTexte}>
            {a.statut === 'reserve' ? t('carte.reserve') : t(`publier.types.${a.type}`)}
          </Texte>
        </View>
        {valide && (
          <View style={styles.badge}>
            <BadgeValide forme="rond" />
          </View>
        )}
      </View>
      <View style={styles.corps}>
        {(a.auteur?.est_pro || sponsorisee) && (
          <View style={styles.mentions}>
            {a.auteur?.est_pro && (
              <View style={styles.pro}>
                <Texte poids={700} style={styles.proTexte}>
                  {t('carte.pro')}
                </Texte>
              </View>
            )}
            {sponsorisee && (
              <Texte poids={600} style={styles.sponsorise}>
                {t('carte.sponsorise')}
              </Texte>
            )}
          </View>
        )}
        <Texte style={styles.titre} numberOfLines={2}>
          {a.titre}
        </Texte>
        <Texte variante="titre" poids={700} style={styles.prix}>
          {don ? t('carte.gratuit') : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t('da')}`}
          {tarif && (
            <Texte poids={600} style={styles.petit}>
              {` ${t(`location.suffixe.${tarif.unite}`)}`}
            </Texte>
          )}
        </Texte>
        {!don && <Texte style={styles.petit}>{formaterEuro(tarif?.prix_da ?? a.prix_da, taux)}</Texte>}
        {a.etat && (
          <Texte poids={600} style={styles.etat}>
            {(t(`etats.${a.etat}`, { returnObjects: true }) as unknown as string[])[0]}
          </Texte>
        )}
        {lieu ? (
          <Texte style={styles.petit} numberOfLines={1}>
            {lieu}
          </Texte>
        ) : null}
        {(a.envoi_algerie || a.livraison_wilaya) && (
          <Texte poids={600} style={styles.livraison} numberOfLines={1}>
            {a.envoi_algerie
              ? t('options.livraison69')
              : t('options.livraisonVille', { lieu: wilaya ? (langue === 'ar' ? wilaya.nom_ar : wilaya.nom_fr) : '' })}
          </Texte>
        )}
      </View>
    </Pressable>
  );
}

const ORDRE = ['nuit', 'jour', 'semaine', 'mois', '6_mois', 'an'];
const premierTarif = (tarifs: Tarif[]) => [...tarifs].sort((x, y) => ORDRE.indexOf(x.unite) - ORDRE.indexOf(y.unite))[0] ?? null;

const styles = StyleSheet.create({
  carte: { flex: 1, backgroundColor: colors.carte, borderRadius: 16, overflow: 'hidden' },
  tuile: { height: 108, alignItems: 'center', justifyContent: 'center' },
  type: {
    position: 'absolute',
    top: 8,
    start: 8,
    backgroundColor: colors.brun,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeTexte: { fontSize: 11, color: colors.sable1 },
  corps: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 3 },
  mentions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pro: { borderWidth: 1.5, borderColor: colors.brun, borderRadius: 4, paddingHorizontal: 5 },
  proTexte: { fontSize: 10 },
  badge: { position: 'absolute', top: 6, end: 6 },
  livraison: { fontSize: 11, color: colors.vert },
  sponsorise: { fontSize: 11, color: colors.brunMoyen },
  titre: { fontSize: 13, lineHeight: 18, minHeight: 36 },
  prix: { fontSize: 16 },
  petit: { fontSize: 12, color: colors.brunMoyen },
  etat: { fontSize: 12 },
});
