import { useMemo, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { VignetteSansPhoto } from '@/components/annonces/VignetteSansPhoto';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { couleursTuile } from '@/components/annonces/tuile';
import { Bouton } from '@/components/Bouton';
import { Calendrier } from '@/components/Calendrier';
import { Champ, Libelle, styleChamp } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeChevronBas } from '@/components/Icones';
import { Pastille } from '@/components/Pastille';
import { Texte } from '@/components/Texte';
import { lireAnnoncesParIds, photoPrincipale, type AnnonceResume } from '@/lib/annonces';
import {
  ajouterMois,
  chercherLocations,
  depuisTexte,
  moisDeDuree,
  type CriteresLocation,
  type Duree,
  type Genre,
  type ResultatLocation,
} from '@/lib/location';
import { urlPhoto } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { formaterEuro, formaterNombre, lirePrix } from '@/lib/prix';
import { numeroWilaya, useCategories, useReglages, useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

const DUREES: Duree[] = ['dates', '1_mois', '6_mois', '1_an'];
const TYPES_LOGEMENT = ['Studio', 'F2', 'F3', 'F4 et plus', 'Maison'];
const TYPES_VEHICULE = ['Citadine', 'Berline', 'SUV', 'Utilitaire'];
const BOITES = ['Manuelle', 'Automatique'];

type Ligne = { annonce: AnnonceResume; resultat: ResultatLocation };

/** Recherche de location façon Booking : logement ou véhicule, dates ou durée, total pour toute la période. */
export default function RechercheLocation() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue } = usePreferences();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();
  const { donnees: categories } = useCategories();

  const [genre, setGenre] = useState<Genre>('logement');
  const [duree, setDuree] = useState<Duree>('dates');
  const [debut, setDebut] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [personnes, setPersonnes] = useState(2);
  const [boite, setBoite] = useState<string | null>(null);
  const [places, setPlaces] = useState(2);
  const [budget, setBudget] = useState('');
  const [feuilleWilayas, setFeuilleWilayas] = useState(false);

  const [resultats, setResultats] = useState<Ligne[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [tri, setTri] = useState<'asc' | 'desc'>('asc');

  const nomsMois = t('mois', { returnObjects: true }) as unknown as string[];
  const court = (d: string) => `${depuisTexte(d).getDate()} ${nomsMois[depuisTexte(d).getMonth()]}`;
  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const w = wilayas?.find((x) => x.code === wilaya);
  const vehicule = genre === 'vehicule';
  const datesOk = duree === 'dates' ? !!debut && !!fin : !!debut;
  const taux = reglages?.taux_dinar_euro ?? 0.0037;

  // Libellés des types et boîtes : repris des caractéristiques en base (français / arabe).
  const options = useMemo(() => {
    const crit = categories?.flatMap((c) => c.criteres) ?? [];
    const libelle = (cle: string, v: string) => crit.find((c) => c.cle === cle)?.options?.find((o) => o.v === v)?.[langue] ?? v;
    return { libelle };
  }, [categories, langue]);

  const changerGenre = (g: Genre) => {
    setGenre(g);
    setTypes([]);
    setBoite(null);
    setDebut(null);
    setFin(null);
  };

  const chercher = async () => {
    if (!debut || !datesOk) return;
    setEnCours(true);
    setErreur(false);
    const criteres: CriteresLocation = {
      genre,
      duree,
      debut,
      fin: duree === 'dates' ? fin : ajouterMois(debut, moisDeDuree(duree)),
      wilaya,
      types,
      minPersonnes: vehicule ? null : personnes,
      boite: vehicule ? boite : null,
      minPlaces: vehicule ? places : null,
      budget: lirePrix(budget),
    };
    try {
      const r = await chercherLocations(criteres);
      const annonces = await lireAnnoncesParIds(r.map((x) => x.annonce_id));
      setResultats(
        r.map((x) => ({ resultat: x, annonce: annonces.find((a) => a.id === x.annonce_id)! })).filter((x) => x.annonce),
      );
    } catch {
      setErreur(true);
    }
    setEnCours(false);
  };

  const libelleDates = !debut
    ? t(duree === 'dates' ? (vehicule ? 'location.priseRetour' : 'location.arriveeDepart') : 'location.debutSeul')
    : duree !== 'dates'
      ? t('location.aPartirDu', { debut: court(debut), duree: t(`location.durees.${duree}`) })
      : !fin
        ? t('location.choisirFin', { debut: court(debut) })
        : t('location.du', { debut: court(debut), fin: court(fin) });

  // ---------- Résultats ----------
  if (resultats) {
    const tries = [...resultats].sort((a, b) => (tri === 'asc' ? a.resultat.total - b.resultat.total : b.resultat.total - a.resultat.total));
    const resume = [
      w ? nom(w) : t('location.toutesWilayas'),
      debut ? (duree === 'dates' && fin ? `${court(debut)} – ${court(fin)}` : `${court(debut)} · ${t(`location.durees.${duree}`)}`) : '',
      vehicule ? '' : t('location.personnesResume', { count: personnes }),
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('location.recherche')} />
        <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.resume}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texte poids={700} style={{ fontSize: 16, color: colors.sable1 }}>
                {t(vehicule ? 'location.resultatsV' : 'location.resultats', { count: resultats.length })}
              </Texte>
              <Texte style={{ fontSize: 12, color: colors.sable3 }}>{resume}</Texte>
            </View>
            <Pressable onPress={() => setResultats(null)} accessibilityRole="button" style={styles.modifier}>
              <Texte poids={700} style={{ fontSize: 13, color: colors.sable1 }}>
                {t('location.modifier')}
              </Texte>
            </Pressable>
          </View>

          <View style={styles.rangee}>
            <Pastille libelle={t('recherche.tris.prix_croissant')} choisi={tri === 'asc'} onPress={() => setTri('asc')} />
            <Pastille libelle={t('recherche.tris.prix_decroissant')} choisi={tri === 'desc'} onPress={() => setTri('desc')} />
          </View>

          {tries.length === 0 && (
            <EtatVide illustration="cle" texte={t('location.aucun')}>
              <Bouton libelle={t('location.modifierRecherche')} onPress={() => setResultats(null)} variante="contour" />
            </EtatVide>
          )}

          {tries.map(({ annonce: a, resultat: r }) => {
            const categorie = categories?.find((c) => c.cle === a.categorie);
            const tuile = couleursTuile(categorie?.icone ?? 'grid');
            const photo = photoPrincipale(a);
            const ville = a.ville || (wilayas?.find((x) => x.code === a.wilaya_code)?.[langue === 'ar' ? 'nom_ar' : 'nom_fr'] ?? '');
            const prixUnite = (a.tarifs ?? []).find((x) => x.unite === r.unite);
            return (
              <Pressable
                key={a.id}
                onPress={() =>
                  router.push({
                    pathname: '/annonce/[id]',
                    params: duree === 'dates' && debut && fin ? { id: a.id, debut, fin } : { id: a.id },
                  })
                }
                accessibilityRole="button"
                style={({ pressed }) => [styles.resultat, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.vignette, { backgroundColor: tuile.fond }]}>
                  {photo ? (
                    <Image source={{ uri: urlPhoto(photo) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <VignetteSansPhoto icone={categorie?.icone ?? 'grid'} tailleIcone={34} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 3, padding: 12 }}>
                  <Texte poids={600} style={{ fontSize: 14 }} numberOfLines={2}>
                    {a.titre}
                  </Texte>
                  <Texte style={styles.petit}>{ville}</Texte>
                  {prixUnite && (
                    <Texte poids={600} style={{ fontSize: 13 }}>
                      {`${formaterNombre(prixUnite.prix_da)} ${t('da')} ${t(`location.suffixe.${r.unite}`)}`}
                    </Texte>
                  )}
                  <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
                    {t('location.total', { total: formaterNombre(r.total) })}
                  </Texte>
                  <Texte style={styles.petit}>
                    {`${t(`location.unites.${r.unite}`, { count: r.nombre })} · ${formaterEuro(r.total, taux)}`}
                  </Texte>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ---------- Formulaire ----------
  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('location.recherche')} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <View style={styles.onglets}>
          {(['logement', 'vehicule'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => changerGenre(g)}
              accessibilityRole="button"
              accessibilityState={{ selected: genre === g }}
              style={[styles.onglet, genre === g && styles.ongletActif]}
            >
              <Texte poids={600} style={{ fontSize: 14, textAlign: 'center' }}>
                {t(`location.${g}`)}
              </Texte>
            </Pressable>
          ))}
        </View>

        <View style={styles.bloc}>
          <Libelle>{t('location.ou')}</Libelle>
          <Pressable onPress={() => setFeuilleWilayas(true)} accessibilityRole="button" style={styles.selecteur}>
            <Texte style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
              {w ? `${numeroWilaya(w.code)} · ${nom(w)}` : t('location.toutesWilayas')}
            </Texte>
            <IconeChevronBas couleur={colors.brunMoyen} />
          </Pressable>
        </View>

        <View style={styles.bloc}>
          <Libelle>{t('location.duree')}</Libelle>
          <View style={styles.grille}>
            {DUREES.map((d) => (
              <Pastille
                key={d}
                libelle={t(`location.durees.${d}`)}
                choisi={duree === d}
                onPress={() => {
                  setDuree(d);
                  setDebut(null);
                  setFin(null);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.bloc}>
          <Libelle>{t('location.choisirDates')}</Libelle>
          <Calendrier
            debut={debut}
            fin={fin}
            plage={duree === 'dates'}
            memeJour={vehicule}
            onChange={(d, f) => {
              setDebut(d);
              setFin(f);
            }}
          />
          <Texte poids={600} style={{ fontSize: 13 }}>
            {libelleDates}
          </Texte>
        </View>

        {!vehicule ? (
          <>
            <View style={styles.bloc}>
              <Libelle>{t('location.typeLogement')}</Libelle>
              <View style={styles.grille}>
                {TYPES_LOGEMENT.map((v) => (
                  <Pastille
                    key={v}
                    libelle={options.libelle('type', v)}
                    choisi={types.includes(v)}
                    onPress={() => setTypes(types.includes(v) ? types.filter((x) => x !== v) : [...types, v])}
                  />
                ))}
              </View>
            </View>
            <Compteur libelle={t('location.personnes')} valeur={personnes} min={1} max={20} onChange={setPersonnes} />
          </>
        ) : (
          <>
            <View style={styles.bloc}>
              <Libelle>{t('location.typeVehicule')}</Libelle>
              <View style={styles.grille}>
                {TYPES_VEHICULE.map((v) => (
                  <Pastille
                    key={v}
                    libelle={options.libelle('type_vehicule', v)}
                    choisi={types.includes(v)}
                    onPress={() => setTypes(types.includes(v) ? types.filter((x) => x !== v) : [...types, v])}
                  />
                ))}
              </View>
            </View>
            <View style={styles.bloc}>
              <Libelle>{t('location.boite')}</Libelle>
              <View style={styles.grille}>
                <Pastille libelle={t('location.indifferente')} choisi={!boite} onPress={() => setBoite(null)} />
                {BOITES.map((v) => (
                  <Pastille key={v} libelle={options.libelle('boite', v)} choisi={boite === v} onPress={() => setBoite(v)} />
                ))}
              </View>
            </View>
            <Compteur libelle={t('location.places')} valeur={places} min={2} max={9} onChange={setPlaces} />
          </>
        )}

        <Champ
          ltr
          libelle={t('location.budget')}
          placeholder="—"
          keyboardType="number-pad"
          value={lirePrix(budget) === null ? '' : formaterNombre(lirePrix(budget)!)}
          onChangeText={setBudget}
          maxLength={16}
        />

        {erreur && <EtatChargement erreur reessayer={chercher} />}
      </ScrollView>
      <View style={[styles.bas, { paddingBottom: insets.bottom + 12 }]}>
        {!datesOk && (
          <Texte poids={600} style={{ fontSize: 13, textAlign: 'center', color: colors.brunMoyen }}>
            {t('location.bloqueDates')}
          </Texte>
        )}
        <Bouton libelle={t('location.chercher')} onPress={chercher} actif={datesOk} occupe={enCours} grand />
      </View>

      <FeuilleWilayas
        visible={feuilleWilayas}
        valeur={wilaya}
        onChoisir={setWilaya}
        onToutes={() => setWilaya(null)}
        onFermer={() => setFeuilleWilayas(false)}
      />
    </View>
  );
}

function Compteur({ libelle, valeur, min, max, onChange }: { libelle: string; valeur: number; min: number; max: number; onChange: (n: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.compteur}>
      <Texte poids={600} style={{ flex: 1, fontSize: 14 }}>
        {libelle}
      </Texte>
      <Pressable
        onPress={() => onChange(Math.max(min, valeur - 1))}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${t('location.moins')}`}
        style={styles.bouton}
      >
        <Texte poids={700} style={{ fontSize: 20 }}>
          −
        </Texte>
      </Pressable>
      <Texte variante="titre" poids={700} style={{ fontSize: 17, minWidth: 28, textAlign: 'center' }}>
        {String(valeur)}
      </Texte>
      <Pressable
        onPress={() => onChange(Math.min(max, valeur + 1))}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${t('location.plus')}`}
        style={styles.bouton}
      >
        <Texte poids={700} style={{ fontSize: 20 }}>
          +
        </Texte>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 18, paddingBottom: 32 },
  onglets: { flexDirection: 'row', backgroundColor: colors.sable2, borderRadius: 12, padding: 4, gap: 4 },
  onglet: { flex: 1, height: toucheMin, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ongletActif: { backgroundColor: colors.carte },
  bloc: { gap: 8 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangee: { flexDirection: 'row', gap: 8 },
  selecteur: { ...styleChamp, flexDirection: 'row', alignItems: 'center', gap: 10 },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bouton: {
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    borderWidth: 1.5,
    borderColor: colors.sable4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bas: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.sable2, backgroundColor: colors.blanc },
  resume: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.brun },
  modifier: {
    minHeight: toucheMin - 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    justifyContent: 'center',
  },
  resultat: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.carte },
  vignette: { width: 110, alignItems: 'center', justifyContent: 'center' },
  petit: { fontSize: 12, color: colors.brunMoyen },
});
