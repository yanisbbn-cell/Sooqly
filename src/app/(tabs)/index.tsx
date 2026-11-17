import { useCallback, useEffect, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { CarteAnnonce } from '@/components/annonces/CarteAnnonce';
import { GrilleFantome } from '@/components/annonces/CarteFantome';
import { BandeauANoter } from '@/components/confiance/BandeauANoter';
import { useGrille } from '@/lib/grille';
import { BandeauLocation } from '@/components/annonces/BandeauLocation';
import { RangeeALaUne } from '@/components/annonces/RangeeALaUne';
import { estSponsorisee } from '@/lib/annonces';
import { BoutonAlerte } from '@/components/BoutonAlerte';
import { rechercheAlertable } from '@/lib/alertes';
import { FeuilleSousCategories } from '@/components/annonces/FeuilleSousCategories';
import { couleursTuile } from '@/components/annonces/tuile';
import { FondTuile } from '@/components/annonces/FondTuile';
import { EnTete } from '@/components/EnTete';
import { EtatChargement } from '@/components/EtatChargement';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeCategorie } from '@/components/IconeCategorie';
import { IconeFiltres, IconeLoupe } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import type { AnnonceResume } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { FILTRES_VIDES, chercherAnnonces, nombreFiltres, useRecherche, type Tri } from '@/lib/recherche';
import { numeroWilaya, useCategories, useReglages, useWilayas, type Categorie } from '@/lib/referentiel';
import { cles, ecrire, lire } from '@/lib/stockage';
import { colors, fonts, iconeTuile, sansContourWeb, toucheMin } from '@/theme';

const TRIS: Tri[] = ['recent', 'prix_croissant', 'prix_decroissant', 'proche'];

/** Onglet Annonces : recherche, catégories, tri, puis les annonces en ligne (sponsorisées d'abord). */
export default function Annonces() {
  const { t } = useTranslation();
  const { langue, rtl } = usePreferences();
  const { profil } = useAuth();
  const grille = useGrille();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();
  const { filtres, setFiltres, tri, setTri } = useRecherche();

  const [brouillon, setBrouillon] = useState(filtres.texte);
  const [champActif, setChampActif] = useState(false);
  const [feuille, setFeuille] = useState<Categorie | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceResume[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);
  // « Près de chez moi » : wilaya choisie sur cet appareil, sinon celle du profil.
  const [wilayaChoisie, setWilayaChoisie] = useState<number | null>(null);
  const [feuilleProche, setFeuilleProche] = useState(false);
  useEffect(() => {
    lire(cles.wilayaProche).then((v) => v && setWilayaChoisie(Number(v)));
  }, []);
  const wilayaRef = wilayaChoisie ?? profil?.wilaya_code ?? null;
  const choisirTri = (x: Tri) => {
    if (x === 'proche' && !wilayaRef) return setFeuilleProche(true);
    setTri(x);
  };

  useEffect(() => setBrouillon(filtres.texte), [filtres.texte]);

  const catChoisie = categories.donnees?.find((c) => c.cle === filtres.categorie);
  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setAnnonces(await chercherAnnonces(filtres, catChoisie?.criteres ?? [], tri, wilayaRef, wilayas));
    } catch {
      setErreur(true);
    }
  }, [filtres, catChoisie, tri, wilayaRef, wilayas]);

  // Recharge à chaque retour sur l'onglet (une annonce a pu être validée entre-temps).
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const rafraichir = async () => {
    setRafraichit(true);
    await charger();
    setRafraichit(false);
  };

  const lancer = () => setFiltres({ ...filtres, texte: brouillon.trim() });
  const effacerTexte = () => {
    setBrouillon('');
    setFiltres({ ...filtres, texte: '' });
  };

  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const fil = catChoisie
    ? [nom(catChoisie), ...catChoisie.sous_categories.filter((s) => filtres.sousCategories.includes(s.id)).map(nom)].join(' › ')
    : '';
  const nbFiltres = nombreFiltres(filtres);
  const recherche = filtres.texte !== '';
  const enAttente = brouillon.trim() !== filtres.texte;

  const choisirCategorie = (c: Categorie | null) => {
    if (!c) setFiltres({ ...filtres, categorie: null, sousCategories: [], criteres: {} });
    else if (c.sous_categories.length) setFeuille(c);
    else setFiltres({ ...filtres, categorie: c.cle, sousCategories: [], criteres: c.cle === filtres.categorie ? filtres.criteres : {} });
  };

  const wRef = wilayas?.find((w) => w.code === wilayaRef);

  const enTete = (
    <View>
      <EnTete />
      <View style={styles.bandeRecherche}>
        <View style={styles.rangee}>
          <View style={[styles.recherche, champActif && { borderColor: colors.accent }]}>
            <TextInput
              value={brouillon}
              onFocus={() => setChampActif(true)}
              onBlur={() => setChampActif(false)}
              onChangeText={setBrouillon}
              onSubmitEditing={lancer}
              placeholder={t('recherche.champ')}
              placeholderTextColor={colors.brunMoyen}
              accessibilityLabel={t('recherche.champ')}
              returnKeyType="search"
              autoCorrect={false}
              maxLength={80}
              style={[
                sansContourWeb,
                styles.champ,
                { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' },
              ]}
            />
            {brouillon !== '' && (
              <Pressable onPress={effacerTexte} accessibilityRole="button" accessibilityLabel={t('recherche.effacer')} style={styles.croix}>
                <Texte style={styles.croixTexte}>×</Texte>
              </Pressable>
            )}
            <Pressable onPress={lancer} accessibilityRole="button" accessibilityLabel={t('recherche.lancer')} style={styles.loupe}>
              <IconeLoupe couleur={colors.blanc} taille={18} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/filtres')}
            accessibilityRole="button"
            accessibilityLabel={nbFiltres ? `${t('recherche.filtres')} (${nbFiltres})` : t('recherche.filtres')}
            style={({ pressed }) => [styles.boutonFiltres, pressed && { opacity: 0.8 }]}
          >
            <IconeFiltres couleur={colors.sable1} />
            {nbFiltres > 0 && (
              <View style={styles.pastilleNombre}>
                <Texte poids={700} style={styles.pastilleNombreTexte}>
                  {String(nbFiltres)}
                </Texte>
              </View>
            )}
          </Pressable>
        </View>
        {enAttente && brouillon.trim() !== '' && <Texte style={styles.attente}>{t('recherche.enAttente')}</Texte>}
      </View>

      {recherche ? (
        <View style={styles.resultat} accessibilityRole="summary">
          <View style={{ flex: 1, gap: 2 }}>
            <Texte poids={700} style={{ fontSize: 16, color: colors.sable1 }}>
              {t(annonces?.length === 0 ? 'recherche.aucunResultat' : 'recherche.resultats', { q: filtres.texte })}
            </Texte>
            {annonces && (
              <Texte style={{ fontSize: 12, color: colors.sable3 }}>
                {[t('accueil2.nombre', { count: annonces.length }), nbFiltres ? t('recherche.avecFiltres', { count: nbFiltres }) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Texte>
            )}
          </View>
          <Pressable onPress={effacerTexte} accessibilityRole="button" style={styles.resultatEffacer}>
            <Texte poids={700} style={{ fontSize: 13, color: colors.sable1 }}>
              {t('recherche.effacerCourt')}
            </Texte>
          </Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tuiles}>
          <TuileCategorie libelle={t('accueil2.tout')} icone="grid" active={!filtres.categorie} onPress={() => choisirCategorie(null)} />
          {categories.donnees?.map((c) => (
            <TuileCategorie
              key={c.cle}
              libelle={langue === 'fr' && c.nom_court_fr ? c.nom_court_fr : nom(c)}
              icone={c.icone}
              active={filtres.categorie === c.cle}
              onPress={() => choisirCategorie(c)}
            />
          ))}
        </ScrollView>
      )}

      {!recherche && !catChoisie && <BandeauANoter />}

      {!recherche && !catChoisie && <BandeauLocation />}

      {catChoisie && (
        <View style={styles.filRangee}>
          <View style={styles.fil}>
            <Pressable
              onPress={() => catChoisie.sous_categories.length && setFeuille(catChoisie)}
              accessibilityRole="button"
              style={styles.filTexteZone}
            >
              <Texte poids={600} style={styles.filTexte} numberOfLines={1}>
                {fil}
              </Texte>
            </Pressable>
            <Pressable
              onPress={() => choisirCategorie(null)}
              accessibilityRole="button"
              accessibilityLabel={t('accueil2.retirerCategorie')}
              style={styles.filCroix}
            >
              <Texte style={styles.filCroixTexte}>×</Texte>
            </Pressable>
          </View>
        </View>
      )}

      <RangeeALaUne annonces={(annonces ?? []).filter(estSponsorisee)} categories={categories.donnees ?? null} />

      {!recherche && (
        <View style={styles.titreListe}>
          <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
            {t('accueil2.recentes')}
          </Texte>
          {annonces && <Texte style={styles.nombre}>{t('accueil2.nombre', { count: annonces.length })}</Texte>}
        </View>
      )}

      {rechercheAlertable(filtres) && <BoutonAlerte filtres={filtres} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tris}>
        <Texte poids={700} style={styles.trierTexte}>
          {t('recherche.trier')}
        </Texte>
        {TRIS.map((x) => (
          <Pressable
            key={x}
            onPress={() => choisirTri(x)}
            accessibilityRole="button"
            accessibilityState={{ selected: tri === x }}
            style={[styles.tri, tri === x && styles.triActif]}
          >
            <Texte poids={600} style={[styles.triTexte, tri === x && { color: colors.sable1 }]}>
              {t(`recherche.tris.${x}`)}
            </Texte>
          </Pressable>
        ))}
      </ScrollView>
      {tri === 'proche' && wRef && (
        <View style={styles.autour}>
          <Texte style={{ flex: 1, fontSize: 13, color: colors.brunMoyen }}>
            {t('recherche.autourDe', { wilaya: `${numeroWilaya(wRef.code)} · ${nom(wRef)}` })}
          </Texte>
          <Pressable onPress={() => setFeuilleProche(true)} accessibilityRole="button" hitSlop={10} style={styles.changer}>
            <Texte poids={700} style={{ fontSize: 13, color: colors.accentFonce, textDecorationLine: 'underline' }}>
              {t('recherche.changerWilaya')}
            </Texte>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.ecran}>
      <FlatList
        data={annonces ?? []}
        // La clé change avec le nombre de colonnes (obligatoire pour une FlatList).
        key={`grille-${grille.colonnes}`}
        keyExtractor={(a) => a.id}
        numColumns={grille.colonnes}
        ListHeaderComponent={enTete}
        columnWrapperStyle={styles.rangeeCartes}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={rafraichir} tintColor={colors.accent} />}
        renderItem={({ item, index }) => (
          // Les cartes apparaissent en glissant légèrement, l'une après l'autre (les premières seulement).
          <Animated.View
            entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}
            style={[styles.cellule, { width: grille.largeur }]}
          >
            <CarteAnnonce
              annonce={item}
              categorie={categories.donnees?.find((c) => c.cle === item.categorie)}
              wilaya={wilayas?.find((w) => w.code === item.wilaya_code)}
              taux={reglages?.taux_dinar_euro ?? 0.0037}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          !annonces ? (
            erreur ? (
              <EtatChargement erreur reessayer={charger} />
            ) : (
              <GrilleFantome colonnes={grille.colonnes} largeur={grille.largeur} />
            )
          ) : (
            <EtatVide
              illustration={filtres.categorie || recherche || nbFiltres ? 'loupe' : 'couffin'}
              texte={t(filtres.categorie || recherche || nbFiltres ? 'accueil2.aucune' : 'accueil2.aucuneEncore')}
            >
              {(filtres.categorie || recherche || nbFiltres > 0) && (
                <Pressable
                  onPress={() => {
                    setBrouillon('');
                    setFiltres(FILTRES_VIDES);
                  }}
                  accessibilityRole="button"
                  style={styles.effacer}
                >
                  <Texte poids={600} style={{ fontSize: 14 }}>
                    {t('accueil2.effacer')}
                  </Texte>
                </Pressable>
              )}
            </EtatVide>
          )
        }
      />

      <FeuilleWilayas
        visible={feuilleProche}
        valeur={wilayaRef}
        onFermer={() => setFeuilleProche(false)}
        onChoisir={(code) => {
          setWilayaChoisie(code);
          ecrire(cles.wilayaProche, String(code));
          setFeuilleProche(false);
          setTri('proche');
        }}
      />

      <FeuilleSousCategories
        categorie={feuille}
        choisies={feuille && feuille.cle === filtres.categorie ? filtres.sousCategories : []}
        onFermer={() => setFeuille(null)}
        onValider={(ids) => {
          if (feuille)
            setFiltres({
              ...filtres,
              categorie: feuille.cle,
              sousCategories: ids,
              criteres: feuille.cle === filtres.categorie ? filtres.criteres : {},
            });
          setFeuille(null);
        }}
      />
    </View>
  );
}

function TuileCategorie({ libelle, icone, active, onPress }: { libelle: string; icone: string; active: boolean; onPress: () => void }) {
  const tuile = couleursTuile(icone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tuile, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      {/* Anneau d'accent autour de la catégorie choisie. */}
      <View style={[styles.anneau, active && { borderColor: colors.accent }]}>
        <View style={styles.tuileIcone}>
          <FondTuile de={tuile.de} a={tuile.a} taille={60} rayon={18} id={icone} />
          {/* Ombre portée de l'icône (léger relief), puis l'icône. */}
          <View style={styles.ombreIcone}>
            <IconeCategorie icone={icone} couleur={colors.brunNuit} taille={28} />
          </View>
          <View style={{ zIndex: 1 }}>
            <IconeCategorie icone={icone} couleur={iconeTuile} taille={28} />
          </View>
        </View>
      </View>
      <Texte poids={active ? 700 : 400} style={styles.tuileTexte} numberOfLines={2}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  autour: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  changer: { minHeight: toucheMin, justifyContent: 'center' },
  ecran: { flex: 1, backgroundColor: colors.blanc },
  bandeRecherche: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recherche: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carte,
    borderRadius: 24,
    // Bordure visible seulement quand le champ est actif (remplace le cadre carré du navigateur).
    borderWidth: 2,
    borderColor: 'transparent',
    paddingStart: 16,
    paddingEnd: 6,
    gap: 4,
  },
  champ: { flex: 1, minWidth: 0, height: '100%', fontSize: 15, color: colors.brun },
  croix: { width: 36, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  croixTexte: { fontSize: 22, color: colors.brunMoyen, lineHeight: 26 },
  loupe: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  boutonFiltres: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.sable3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleNombre: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.accentFonce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleNombreTexte: { fontSize: 11, color: colors.blanc, textAlign: 'center' },
  attente: { fontSize: 12, color: colors.sable3 },
  resultat: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.brun,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultatEffacer: {
    minHeight: toucheMin - 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    justifyContent: 'center',
  },
  // Rangée centrée quand elle tient sur la largeur ; sinon elle défile normalement.
  tuiles: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, gap: 4 },
  // Largeur souple : la tuile s'élargit pour qu'un mot long (« Électroménager ») ne soit jamais coupé en deux.
  tuile: { minWidth: 80, maxWidth: 124, paddingHorizontal: 4, alignItems: 'center', gap: 6 },
  anneau: { padding: 2, borderRadius: 22, borderWidth: 2.5, borderColor: 'transparent' },
  tuileIcone: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(59, 45, 34, 0.28)',
  },
  ombreIcone: { position: 'absolute', top: 17, left: 16, opacity: 0.35 },
  tuileTexte: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  filRangee: { paddingHorizontal: 20, paddingTop: 8 },
  fil: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingStart: 14,
    paddingEnd: 4,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: colors.brun,
  },
  filTexteZone: { flexShrink: 1, minHeight: toucheMin - 8, justifyContent: 'center' },
  filTexte: { fontSize: 13, color: colors.sable1 },
  filCroix: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brunNuit,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filCroixTexte: { fontSize: 18, color: colors.sable1, lineHeight: 22 },
  titreListe: { paddingHorizontal: 20, paddingTop: 14, gap: 2 },
  nombre: { fontSize: 13, color: colors.brunMoyen },
  tris: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 8, alignItems: 'center' },
  trierTexte: { fontSize: 12, color: colors.brunMoyen },
  tri: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    justifyContent: 'center',
  },
  triActif: { backgroundColor: colors.brun, borderColor: colors.brun },
  triTexte: { fontSize: 13 },
  rangeeCartes: { paddingHorizontal: 20, gap: 12 },
  cellule: { marginBottom: 12 },
  effacer: {
    alignSelf: 'flex-start',
    minHeight: toucheMin,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brun,
    justifyContent: 'center',
  },
});
