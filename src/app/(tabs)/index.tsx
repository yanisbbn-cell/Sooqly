import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CarteAnnonce } from '@/components/annonces/CarteAnnonce';
import { FeuilleSousCategories } from '@/components/annonces/FeuilleSousCategories';
import { couleursTuile } from '@/components/annonces/tuile';
import { EnTete } from '@/components/EnTete';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCategorie } from '@/components/IconeCategorie';
import { Texte } from '@/components/Texte';
import { listerAnnonces, type AnnonceResume } from '@/lib/annonces';
import { usePreferences } from '@/lib/preferences';
import { useCategories, useReglages, useWilayas, type Categorie } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

/** Onglet Annonces : catégories, puis les annonces en ligne (sponsorisées d'abord, puis les plus récentes). */
export default function Annonces() {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();

  const [categorie, setCategorie] = useState<string | null>(null);
  const [sousCategories, setSousCategories] = useState<number[]>([]);
  const [feuille, setFeuille] = useState<Categorie | null>(null);
  const [annonces, setAnnonces] = useState<AnnonceResume[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setAnnonces(await listerAnnonces({ categorie, sousCategories }));
    } catch {
      setErreur(true);
    }
  }, [categorie, sousCategories]);

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

  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const catChoisie = categories.donnees?.find((c) => c.cle === categorie);
  const fil = catChoisie
    ? [
        nom(catChoisie),
        ...catChoisie.sous_categories.filter((s) => sousCategories.includes(s.id)).map(nom),
      ].join(' › ')
    : '';

  const choisirCategorie = (c: Categorie | null) => {
    if (!c) {
      setCategorie(null);
      setSousCategories([]);
    } else if (c.sous_categories.length) {
      setFeuille(c);
    } else {
      setCategorie(c.cle);
      setSousCategories([]);
    }
  };

  const enTete = (
    <View>
      <EnTete />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tuiles}>
        <TuileCategorie libelle={t('accueil2.tout')} icone="grid" active={!categorie} onPress={() => choisirCategorie(null)} />
        {categories.donnees?.map((c) => (
          <TuileCategorie
            key={c.cle}
            libelle={langue === 'fr' && c.nom_court_fr ? c.nom_court_fr : nom(c)}
            icone={c.icone}
            active={categorie === c.cle}
            onPress={() => choisirCategorie(c)}
          />
        ))}
      </ScrollView>

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

      <View style={styles.titreListe}>
        <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
          {t('accueil2.recentes')}
        </Texte>
        {annonces && <Texte style={styles.nombre}>{t('accueil2.nombre', { count: annonces.length })}</Texte>}
      </View>
    </View>
  );

  return (
    <View style={styles.ecran}>
      <FlatList
        data={annonces ?? []}
        keyExtractor={(a) => a.id}
        numColumns={2}
        ListHeaderComponent={enTete}
        columnWrapperStyle={styles.rangee}
        contentContainerStyle={{ paddingBottom: 24 }}
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
              <Texte style={{ fontSize: 14, lineHeight: 21 }}>{t(categorie ? 'accueil2.aucune' : 'accueil2.aucuneEncore')}</Texte>
              {categorie && (
                <Pressable onPress={() => choisirCategorie(null)} accessibilityRole="button" style={styles.effacer}>
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
        choisies={feuille && feuille.cle === categorie ? sousCategories : []}
        onFermer={() => setFeuille(null)}
        onValider={(ids) => {
          if (feuille) setCategorie(feuille.cle);
          setSousCategories(ids);
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
  titreListe: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 2 },
  nombre: { fontSize: 13, color: colors.brunMoyen },
  rangee: { paddingHorizontal: 20, gap: 12 },
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
