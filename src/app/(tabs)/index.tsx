import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CarteAnnonce } from '@/components/annonces/CarteAnnonce';
import { BandeauANoter } from '@/components/confiance/BandeauANoter';
import { FeuilleSousCategories } from '@/components/annonces/FeuilleSousCategories';
import { couleursTuile } from '@/components/annonces/tuile';
import { EnTete } from '@/components/EnTete';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCategorie } from '@/components/IconeCategorie';
import { IconeFiltres, IconeLoupe } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import type { AnnonceResume } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { FILTRES_VIDES, chercherAnnonces, nombreFiltres, useRecherche, type Tri } from '@/lib/recherche';
import { useCategories, useReglages, useWilayas, type Categorie } from '@/lib/referentiel';
import { colors, fonts, toucheMin } from '@/theme';

const TRIS: Tri[] = ['recent', 'prix_croissant', 'prix_decroissant', 'proche'];

/** Onglet Annonces : recherche, catégories, tri, puis les annonces en ligne (sponsorisées d'abord). */
export default function Annonces() {
  const { t } = useTranslation();
  const { langue, rtl } = usePreferences();
  const { profil } = useAuth();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();
  const { filtres, setFiltres, tri, setTri } = useRecherche();

  const [brouillon, setBrouillon] = useState(filtres.texte);
  const [feuille, setFeuille] = useState<Categorie | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceResume[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  useEffect(() => setBrouillon(filtres.texte), [filtres.texte]);

  const catChoisie = categories.donnees?.find((c) => c.cle === filtres.categorie);
  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setAnnonces(await chercherAnnonces(filtres, catChoisie?.criteres ?? [], tri, profil?.wilaya_code ?? null));
    } catch {
      setErreur(true);
    }
  }, [filtres, catChoisie, tri, profil?.wilaya_code]);

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

  const tris = TRIS.filter((x) => x !== 'proche' || profil?.wilaya_code);

  const enTete = (
    <View>
      <EnTete />
      <View style={styles.bandeRecherche}>
        <View style={styles.rangee}>
          <View style={styles.recherche}>
            <TextInput
              value={brouillon}
              onChangeText={setBrouillon}
              onSubmitEditing={lancer}
              placeholder={t('recherche.champ')}
              placeholderTextColor={colors.brunMoyen}
              accessibilityLabel={t('recherche.champ')}
              returnKeyType="search"
              autoCorrect={false}
              maxLength={80}
              style={[
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

      {!recherche && !catChoisie && (
        <Pressable
          onPress={() => router.push('/location')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.entreeLocation, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.entreeIcones}>
            <IconeCategorie icone="building" couleur={colors.sable1} taille={22} />
            <IconeCategorie icone="car" couleur={colors.sable1} taille={22} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texte poids={700} style={{ fontSize: 15 }}>
              {t('location.recherche')}
            </Texte>
            <Texte style={{ fontSize: 12, color: colors.brunMoyen }}>{t('location.rechercheSous')}</Texte>
          </View>
          <Texte poids={700} style={{ fontSize: 20, color: colors.accentFonce }}>
            {rtl ? '‹' : '›'}
          </Texte>
        </Pressable>
      )}

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

      {!recherche && (
        <View style={styles.titreListe}>
          <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
            {t('accueil2.recentes')}
          </Texte>
          {annonces && <Texte style={styles.nombre}>{t('accueil2.nombre', { count: annonces.length })}</Texte>}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tris}>
        <Texte poids={700} style={styles.trierTexte}>
          {t('recherche.trier')}
        </Texte>
        {tris.map((x) => (
          <Pressable
            key={x}
            onPress={() => setTri(x)}
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
    </View>
  );

  return (
    <View style={styles.ecran}>
      <FlatList
        data={annonces ?? []}
        keyExtractor={(a) => a.id}
        numColumns={2}
        ListHeaderComponent={enTete}
        columnWrapperStyle={styles.rangeeCartes}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={rafraichir} tintColor={colors.accent} />}
        renderItem={({ item, index }) => (
          <View style={[styles.cellule, index === (annonces?.length ?? 0) - 1 && index % 2 === 0 && styles.celluleSeule]}>
            <CarteAnnonce
              annonce={item}
              categorie={categories.donnees?.find((c) => c.cle === item.categorie)}
              wilaya={wilayas?.find((w) => w.code === item.wilaya_code)}
              taux={reglages?.taux_dinar_euro ?? 0.0037}
            />
          </View>
        )}
        ListEmptyComponent={
          !annonces ? (
            <EtatChargement erreur={erreur} reessayer={charger} />
          ) : (
            <View style={styles.vide}>
              <Texte style={{ fontSize: 14, lineHeight: 21 }}>
                {t(filtres.categorie || recherche || nbFiltres ? 'accueil2.aucune' : 'accueil2.aucuneEncore')}
              </Texte>
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
            </View>
          )
        }
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
      style={({ pressed }) => [styles.tuile, pressed && { opacity: 0.8 }]}
    >
      <View
        style={[
          styles.tuileIcone,
          { backgroundColor: active ? colors.brun : tuile.fond },
          active && { borderColor: colors.accent, borderWidth: 2 },
        ]}
      >
        <IconeCategorie icone={icone} couleur={active ? colors.sable1 : tuile.trait} taille={28} />
      </View>
      <Texte poids={active ? 700 : 400} style={styles.tuileTexte} numberOfLines={2}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entreeLocation: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.carte,
    borderWidth: 1,
    borderColor: colors.sable2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entreeIcones: { flexDirection: 'row', gap: 4, padding: 10, borderRadius: 12, backgroundColor: colors.brun },
  bandeRecherche: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recherche: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carte,
    borderRadius: 24,
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
  tuiles: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, gap: 4 },
  tuile: { width: 80, alignItems: 'center', gap: 6 },
  tuileIcone: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
  cellule: { flex: 1, marginBottom: 12 },
  celluleSeule: { maxWidth: '50%', paddingEnd: 6 },
  vide: { marginHorizontal: 20, padding: 20, borderRadius: 14, backgroundColor: colors.sable2, gap: 12 },
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
