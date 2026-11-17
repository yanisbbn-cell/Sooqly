import { useCallback, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { VignetteSansPhoto } from '@/components/annonces/VignetteSansPhoto';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EcranProvisoire } from '@/components/EcranProvisoire';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeFavori } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { couleursTuile } from '@/components/annonces/tuile';
import { photoPrincipale } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { baisse, changerAlertePrix, mesFavoris, retirerFavori, type Favori } from '@/lib/favoris';
import { tarifCourt } from '@/lib/location';
import { urlPhoto } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre } from '@/lib/prix';
import { useCategories, useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

/** Onglet Favoris : annonces enregistrées, alerte de baisse de prix pour chacune. */
export default function Favoris() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [liste, setListe] = useState<Favori[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    if (!profil) return;
    setErreur(false);
    try {
      setListe(await mesFavoris(profil.id));
    } catch {
      setErreur(true);
    }
  }, [profil]);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  if (!profil) {
    return (
      <EcranProvisoire titre={t('favoris.titre')} texte={t('favoris.connexion')}>
        <Bouton libelle={t('favoris.connexionBouton')} onPress={() => router.navigate('/compte')} />
      </EcranProvisoire>
    );
  }

  const mettreAJour = (annonceId: string, f: (x: Favori) => Favori | null) =>
    setListe((l) => (l ?? []).map((x) => (x.annonce_id === annonceId ? f(x) : x)).filter((x): x is Favori => !!x));

  return (
    <View style={styles.ecran}>
      <View style={[styles.entete, { paddingTop: insets.top + 18 }]}>
        <Texte variante="titre" poids={700} style={{ fontSize: 24, color: colors.sable1 }} accessibilityRole="header">
          {t('favoris.titre')}
        </Texte>
        {liste && liste.length > 0 && (
          <Texte style={{ fontSize: 13, color: colors.sable3 }}>{t('favoris.compte', { count: liste.length })}</Texte>
        )}
      </View>
      <FlatList
        data={liste ?? []}
        keyExtractor={(f) => f.annonce_id}
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => {
              setRafraichit(true);
              await charger();
              setRafraichit(false);
            }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={liste && liste.length > 0 ? <Texte style={styles.intro}>{t('favoris.intro')}</Texte> : undefined}
        ListEmptyComponent={
          liste ? (
            <EtatVide illustration="coeur" texte={t('favoris.vide')} />
          ) : (
            <EtatChargement erreur={erreur} reessayer={charger} />
          )
        }
        renderItem={({ item }) => (
          <CarteFavori
            favori={item}
            onRetire={() => mettreAJour(item.annonce_id, () => null)}
            onAlerte={(active) => mettreAJour(item.annonce_id, (x) => ({ ...x, alerte_prix: active }))}
          />
        )}
      />
    </View>
  );
}

function CarteFavori({ favori: f, onRetire, onAlerte }: { favori: Favori; onRetire: () => void; onAlerte: (active: boolean) => void }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const { profil } = useAuth();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);
  const a = f.annonce;

  const agir = async (action: () => Promise<boolean>, apres: () => void) => {
    setOccupe(true);
    setErreur(false);
    const ok = await action();
    setOccupe(false);
    if (ok) apres();
    else setErreur(true);
  };

  if (!a || !profil) {
    return (
      <View style={[styles.carte, styles.ligne]}>
        <Texte style={{ flex: 1, fontSize: 13, color: colors.brunMoyen }}>{t('favoris.indisponible')}</Texte>
        <Pressable
          onPress={() => profil && agir(() => retirerFavori(profil.id, f.annonce_id), onRetire)}
          disabled={occupe}
          accessibilityRole="button"
          style={styles.petitBouton}
        >
          <Texte poids={700} style={{ fontSize: 13 }}>
            {t('favoris.retirerCourt')}
          </Texte>
        </Pressable>
      </View>
    );
  }

  const categorie = categories.donnees?.find((c) => c.cle === a.categorie);
  const tuile = couleursTuile(categorie?.icone ?? 'grid');
  const photo = photoPrincipale(a);
  const tarif = a.type === 'location' ? tarifCourt(a.tarifs ?? []) ?? a.tarifs?.[0] ?? null : null;
  const pourcent = baisse(f);
  const w = wilayas?.find((x) => x.code === a.wilaya_code);
  const lieu = a.ville || (w ? (langue === 'ar' ? w.nom_ar : w.nom_fr) : '');
  const location = a.type === 'location';
  const don = a.type === 'don';

  return (
    <View style={styles.carte}>
      <Pressable
        onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: a.id } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.vignette, { backgroundColor: tuile.fond }]}>
          {photo ? (
            <Image source={{ uri: urlPhoto(photo) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <VignetteSansPhoto icone={categorie?.icone ?? 'grid'} tailleIcone={28} />
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Texte poids={600} style={{ fontSize: 14 }} numberOfLines={2}>
            {a.titre}
          </Texte>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
              {don ? t('carte.gratuit') : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t('da')}`}
              {tarif ? ` ${t(`location.suffixe.${tarif.unite}`)}` : ''}
            </Texte>
            {pourcent !== null && f.prix_ajout_da && (
              <Texte style={{ fontSize: 12, color: colors.brunMoyen, textDecorationLine: 'line-through' }}>
                {formaterNombre(f.prix_ajout_da)} {t('da')}
              </Texte>
            )}
          </View>
          {pourcent !== null && (
            <View style={styles.baisse}>
              <Texte poids={700} style={{ fontSize: 11, color: colors.vert }}>
                {t('favoris.baisse', { pourcent })}
              </Texte>
            </View>
          )}
          <Texte style={{ fontSize: 12, color: colors.brunMoyen }}>
            {a.statut === 'reserve' ? `${t('carte.reserve')} · ${lieu}` : lieu}
          </Texte>
        </View>
        <Pressable
          onPress={() => agir(() => retirerFavori(profil.id, a.id), onRetire)}
          disabled={occupe}
          accessibilityRole="button"
          accessibilityLabel={t('favoris.retirer')}
          hitSlop={4}
          style={styles.marque}
        >
          <IconeFavori couleur={colors.accent} taille={22} plein />
        </Pressable>
      </Pressable>
      {!location && !don && (
        <Pressable
          onPress={() => agir(() => changerAlertePrix(profil.id, a.id, !f.alerte_prix), () => onAlerte(!f.alerte_prix))}
          disabled={occupe}
          accessibilityRole="switch"
          accessibilityState={{ checked: f.alerte_prix }}
          style={[styles.alerte, f.alerte_prix && styles.alerteActive]}
        >
          <View style={[styles.case, f.alerte_prix && styles.caseActive]} />
          <Texte poids={700} style={{ fontSize: 13, color: f.alerte_prix ? colors.vert : colors.brun }}>
            {f.alerte_prix ? t('favoris.alerteActive') : t('favoris.alerte')}
          </Texte>
        </Pressable>
      )}
      {erreur && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
          {t('favoris.erreur')}
        </Texte>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 18, gap: 4 },
  contenu: { padding: 16, gap: 12 },
  intro: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
  carte: { padding: 12, borderRadius: 16, backgroundColor: colors.carte, gap: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vignette: { width: 104, height: 78, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  baisse: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.vertFond,
    borderWidth: 1,
    borderColor: colors.vertBord,
  },
  marque: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  alerte: {
    minHeight: toucheMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    backgroundColor: colors.blanc,
  },
  alerteActive: { borderColor: colors.vertBord, backgroundColor: colors.vertFond },
  case: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.sable4 },
  caseActive: { borderColor: colors.vert, backgroundColor: colors.vert },
  petitBouton: { minHeight: toucheMin, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.sable4, justifyContent: 'center' },
});
