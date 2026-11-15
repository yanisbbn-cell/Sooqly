import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Calendrier } from '@/components/Calendrier';
import { Champ, Libelle, styleChamp } from '@/components/Champ';
import { EtatChargement } from '@/components/EtatChargement';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeChevronBas, IconeCoche, IconeRetour } from '@/components/Icones';
import { Pastille } from '@/components/Pastille';
import { Texte } from '@/components/Texte';

import { EtapePhotos } from './EtapePhotos';
import {
  ACTIVITES_PRO,
  ETATS,
  envoyerAnnonce,
  etatDemande,
  typePourCategorie,
  type ActivitePro,
  type Etat,
} from '@/lib/annonces';
import type { Profil } from '@/lib/auth';
import {
  UNITES,
  cleFourchette,
  enregistrerLocation,
  genrePourCategorie,
  depuisTexte,
  type Unite,
} from '@/lib/location';
import { envoyerPhotos, type PhotoLocale } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { formaterEuro, formaterNombre, fourchette, lirePrix } from '@/lib/prix';
import {
  famillesDetectees,
  numeroWilaya,
  useCategories,
  useMotsInterdits,
  useReglages,
  useWilayas,
  type Categorie,
  type Critere,
} from '@/lib/referentiel';
import { colors, fonts, toucheMin } from '@/theme';

type CleEtape = 'cat' | 'desc' | 'etat' | 'photos' | 'prix' | 'recap';

/** Assistant « Publier une annonce » : catégorie, description, état, photos, prix et lieu, vérification. */
export function AssistantPublication({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const { langue, rtl } = usePreferences();
  const categories = useCategories();
  const reglages = useReglages();
  const { donnees: motsInterdits } = useMotsInterdits();
  const { donnees: wilayas } = useWilayas();
  const defilement = useRef<ScrollViewInstance>(null);

  const [index, setIndex] = useState(0);
  const [pro, setPro] = useState(false);
  const [activite, setActivite] = useState<ActivitePro | null>(null);
  const [nomCommercial, setNomCommercial] = useState('');
  const [cleCategorie, setCleCategorie] = useState<string | null>(null);
  const [sousCategorie, setSousCategorie] = useState<number | null>(null);
  const [listeOuverte, setListeOuverte] = useState(true);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [carac, setCarac] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<Etat | null>(null);
  const [prixSaisi, setPrixSaisi] = useState('');
  const [enLocation, setEnLocation] = useState(false);
  const [tarifsSaisis, setTarifsSaisis] = useState<Partial<Record<Unite, string>>>({});
  const [dispo, setDispo] = useState<{ debut: string | null; fin: string | null }>({ debut: null, fin: null });
  const [locationEnregistree, setLocationEnregistree] = useState(false);
  const [permisExige, setPermisExige] = useState(false);
  const [wilaya, setWilaya] = useState<number | null>(profil.wilaya_code);
  const [ville, setVille] = useState(profil.ville ?? '');
  const [feuilleWilayas, setFeuilleWilayas] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);
  const [photos, setPhotos] = useState<PhotoLocale[]>([]);
  // Annonce déjà créée lors d'un essai précédent (si l'envoi des photos a échoué) : on ne la recrée pas.
  const [annonceCreee, setAnnonceCreee] = useState<string | null>(null);
  const [erreurPhotos, setErreurPhotos] = useState(false);

  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const bi = (x: { fr: string; ar: string }) => x[langue];

  const categorie: Categorie | undefined = categories.donnees?.find((c) => c.cle === cleCategorie);
  const sous = categorie?.sous_categories.find((s) => s.id === sousCategorie);
  const genre = cleCategorie ? genrePourCategorie(cleCategorie) : null;
  const location = !!genre && enLocation;
  const type = location ? 'location' : cleCategorie ? typePourCategorie(cleCategorie) : 'vente';
  const estDon = type === 'don';
  // L'état de l'objet concerne la vente et le don, pas la location.
  const avecEtat = !!cleCategorie && etatDemande(cleCategorie) && !location;
  const etapes: CleEtape[] = ['cat', 'desc', ...(avecEtat ? (['etat'] as const) : []), 'photos', 'prix', 'recap'];
  const i = Math.min(index, etapes.length - 1);
  const etape = etapes[i]!;
  const taux = reglages.donnees?.taux_dinar_euro ?? 0.0037;
  const anglesParCategorie = t('photos.angles', { returnObjects: true }) as unknown as Record<string, string[]>;
  const angles = anglesParCategorie[cleCategorie ?? ''] ?? anglesParCategorie.defaut ?? [];

  // ---------- Prix ----------
  const prix = lirePrix(prixSaisi);
  const bornes = categorie && type !== 'location' ? fourchette(categorie.fourchettes_prix, type) : null;

  // ---------- Location : tarifs par durée et disponibilités ----------
  const unites = cleCategorie === 'immobilier' || cleCategorie === 'vehicules' ? UNITES[cleCategorie] : [];
  const tarifs = unites
    .map((u) => ({ unite: u, prix_da: lirePrix(tarifsSaisis[u] ?? '') }))
    .filter((x): x is { unite: Unite; prix_da: number } => x.prix_da !== null);
  const problemesTarifs = tarifs
    .map((x) => {
      const b = categorie?.fourchettes_prix[cleFourchette(x.unite)];
      return b && (x.prix_da < b[0] || x.prix_da > b[1])
        ? t('location.tarifIncoherent', { unite: t(`location.suffixe.${x.unite}`), min: formaterNombre(b[0]), max: formaterNombre(b[1]) })
        : '';
    })
    .filter(Boolean);
  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const dateCourte = (d: string) => {
    const x = depuisTexte(d);
    return `${x.getDate()} ${mois[x.getMonth()]} ${x.getFullYear()}`;
  };
  const quoi = cleCategorie ? t(`publier.quoi.${cleCategorie}` as 'publier.quoi.electro') : '';
  let problemePrix = '';
  if (!estDon && prix !== null && bornes) {
    if (prix < bornes[0]) problemePrix = t('publier.prixTropBas', { quoi, min: formaterNombre(bornes[0]) });
    else if (prix > bornes[1]) problemePrix = t('publier.prixTropHaut', { quoi, max: formaterNombre(bornes[1]) });
  }

  // ---------- Ce qui bloque chaque étape ----------
  // ---------- Détecteur de mots interdits (pendant la saisie) ----------
  const detectees = famillesDetectees(
    [titre, description, ...Object.values(carac)].join(' '),
    pro,
    motsInterdits ?? [],
  );

  const bloque: Record<CleEtape, string> = {
    cat: !cleCategorie
      ? t('publier.bloque.categorie')
      : categorie?.sous_categories.length && !sousCategorie
        ? t('publier.bloque.sousCategorie')
        : pro && (!activite || nomCommercial.trim().length < 2)
          ? t('publier.bloque.nomCommercial')
          : '',
    desc: titre.trim().length < 3 ? t('publier.bloque.titre') : detectees.length
        ? t('detecteur.corriger', {
            motif:
              detectees[0]!.effet === 'professionnel'
                ? t('detecteur.professionnel')
                : langue === 'ar'
                  ? detectees[0]!.motif_ar
                  : detectees[0]!.motif_fr,
          })
        : '',
    etat: avecEtat && !etat ? t('publier.bloque.etat') : '',
    photos: photos.some((p) => p.analyse?.interdit)
      ? t('photos.bloquePhoto')
      : photos.some((p) => !p.analyse)
        ? t('photos.bloqueAnalyse')
        : '',
    prix: location
      ? !tarifs.length || problemesTarifs.length
        ? t('location.bloqueTarif')
        : !dispo.debut || !dispo.fin
          ? t('location.bloqueDispo')
          : !wilaya || !ville.trim()
            ? t('publier.bloque.lieu')
            : ''
      : !estDon && prix === null
        ? t('publier.bloque.prix')
        : problemePrix
          ? t('publier.bloque.prixIncoherent')
          : !wilaya || !ville.trim()
            ? t('publier.bloque.lieu')
            : '',
    recap: '',
  };
  const toutEstBon = etapes.every((e) => !bloque[e]);

  // ---------- Jauge de qualité ----------
  // Les caractéristiques propres à la location (capacité, type de véhicule) ne sont demandées qu'en location.
  const criteres = (categorie?.criteres ?? []).filter((c) => !c.location || location);
  const nbCarac = Object.values(carac).filter((v) => v.trim()).length;
  const points: { cle: keyof typeof pointsEtape; ok: boolean }[] = [
    { cle: 'photos', ok: photos.length >= 4 && !photos.some((p) => p.analyse?.interdit) },
    { cle: 'titre', ok: titre.trim().length >= 12 },
    { cle: 'description', ok: description.trim().length >= 60 },
    { cle: 'caracteristiques', ok: nbCarac >= Math.min(2, criteres.length) },
    ...(avecEtat ? [{ cle: 'etat' as const, ok: !!etat }] : []),
    { cle: 'prix', ok: estDon || (location ? tarifs.length > 0 && !problemesTarifs.length : prix !== null && !problemePrix) },
    { cle: 'lieu', ok: !!wilaya && !!ville.trim() },
  ];
  const pointsEtape = { photos: 'photos', titre: 'desc', description: 'desc', caracteristiques: 'desc', etat: 'etat', prix: 'prix', lieu: 'prix' } as const;
  const nbOk = points.filter((p) => p.ok).length;

  const allerA = (n: number) => {
    setIndex(n);
    defilement.current?.scrollTo({ y: 0, animated: false });
  };
  const suivant = () => !bloque[etape] && allerA(i + 1);

  const choisirCategorie = (c: Categorie) => {
    if (c.cle !== cleCategorie) {
      setCleCategorie(c.cle);
      setSousCategorie(null);
      setCarac({});
      setEtat(null);
    }
    if (c.sous_categories.length) setOuverte(c.cle);
    else setListeOuverte(false);
  };

  const envoyer = async () => {
    if (!toutEstBon || !cleCategorie || !wilaya || occupe) return;
    setOccupe(true);
    setErreur(false);
    setErreurPhotos(false);
    let id = annonceCreee;
    if (!id) {
      const r = await envoyerAnnonce({
        auteurId: profil.id,
        categorie: cleCategorie,
        sousCategorieId: sousCategorie,
        titre,
        description,
        etat,
        caracteristiques: Object.fromEntries(
          Object.entries(carac)
            .filter(([k]) => criteres.some((c) => c.cle === k))
            .map(([k, v]) => [k, criteres.find((c) => c.cle === k)?.type === 'nombre' && v ? Number(v) : v]),
        ),
        prixDa: location ? tarifs[0]!.prix_da : (prix ?? 0),
        location,
        permisExige,
        wilaya,
        ville,
        pro: pro && activite ? { activite, nomCommercial: nomCommercial.trim() } : null,
      });
      if (r.erreur || !r.id) {
        setOccupe(false);
        setErreur(true);
        return;
      }
      id = r.id;
      setAnnonceCreee(id);
    }
    if (location && !locationEnregistree && dispo.debut && dispo.fin) {
      const ok = await enregistrerLocation(id, tarifs, { debut: dispo.debut, fin: dispo.fin });
      if (!ok) {
        setOccupe(false);
        setErreur(true);
        return;
      }
      setLocationEnregistree(true);
    }
    const photosOk = await envoyerPhotos(profil.id, id, photos, angles);
    setOccupe(false);
    if (!photosOk) setErreurPhotos(true);
    else setEnvoyee(true);
  };

  const recommencer = () => {
    setIndex(0);
    setCleCategorie(null);
    setSousCategorie(null);
    setListeOuverte(true);
    setOuverte(null);
    setTitre('');
    setDescription('');
    setCarac({});
    setEtat(null);
    setPrixSaisi('');
    setEnvoyee(false);
    setPhotos([]);
    setAnnonceCreee(null);
    setEnLocation(false);
    setTarifsSaisis({});
    setDispo({ debut: null, fin: null });
    setLocationEnregistree(false);
    setPermisExige(false);
    setErreurPhotos(false);
  };

  // ---------- Annonce envoyée ----------
  if (envoyee) {
    return (
      <View style={styles.ecran}>
        <EnTetePublier titre={t('publier.titre')} />
        <View style={styles.succes}>
          <View style={styles.succesRond}>
            <IconeCoche couleur={colors.blanc} taille={34} epaisseur={3} />
          </View>
          <Texte variante="titre" poids={700} style={styles.succesTitre} accessibilityRole="header">
            {t('publier.envoyeTitre')}
          </Texte>
          <Texte style={styles.succesTexte}>{t('publier.envoyeTexte')}</Texte>
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Bouton libelle={t('publier.retourAnnonces')} onPress={() => router.navigate('/')} />
            <Bouton libelle={t('publier.nouvelle')} onPress={recommencer} variante="contour" />
          </View>
        </View>
      </View>
    );
  }

  if (!categories.donnees) {
    return (
      <View style={styles.ecran}>
        <EnTetePublier titre={t('publier.titre')} />
        <EtatChargement erreur={categories.erreur} reessayer={categories.reessayer} />
      </View>
    );
  }

  const [conseilTitre, conseilTexte] = t(`publier.conseils.${etape}`, { returnObjects: true }) as unknown as [string, string];
  const w = wilayas?.find((x) => x.code === wilaya);

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTetePublier
        titre={t('publier.titre')}
        sousTitre={t('publier.etape', { n: i + 1, total: etapes.length, nom: t(`publier.etapes.${etape}`) })}
        progression={(i + 1) / etapes.length}
      />

      <ScrollView ref={defilement} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenu}>
        <View style={styles.conseil}>
          <Texte poids={700} style={styles.conseilTitre}>
            {conseilTitre}
          </Texte>
          <Texte style={styles.conseilTexte}>{conseilTexte}</Texte>
        </View>

        {/* ---------- 1. Catégorie ---------- */}
        {etape === 'cat' && (
          <>
            <View style={styles.bloc}>
              <Libelle>{t('publier.enTantQue')}</Libelle>
              <View style={styles.rangee}>
                <Pastille libelle={t('publier.particulier')} choisi={!pro} onPress={() => setPro(false)} largeur />
                <Pastille libelle={t('publier.professionnel')} choisi={pro} onPress={() => setPro(true)} largeur />
              </View>
              <Texte style={styles.aide}>{t('publier.noteProfessionnel')}</Texte>
            </View>

            {pro && (
              <>
                <View style={styles.bloc}>
                  <Libelle>{t('publier.activite')}</Libelle>
                  <View style={styles.grille}>
                    {ACTIVITES_PRO.map((a) => (
                      <View key={a} style={styles.demi}>
                        <Pastille libelle={t(`publier.activites.${a}`)} choisi={activite === a} onPress={() => setActivite(a)} />
                      </View>
                    ))}
                  </View>
                </View>
                <Champ
                  libelle={t('publier.nomCommercial')}
                  placeholder={t('publier.nomCommercialEx')}
                  value={nomCommercial}
                  onChangeText={setNomCommercial}
                  maxLength={60}
                />
              </>
            )}

            <View style={styles.bloc}>
              <Libelle>{t('publier.categorie')}</Libelle>
              {categorie && !listeOuverte ? (
                <View style={styles.choix}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texte poids={700} style={{ fontSize: 15 }}>
                      {nom(categorie)}
                    </Texte>
                    {sous && <Texte style={styles.aide}>{nom(sous)}</Texte>}
                  </View>
                  <Pressable
                    onPress={() => {
                      setListeOuverte(true);
                      setOuverte(null);
                    }}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={styles.lien}
                  >
                    <Texte poids={700} style={styles.lienTexte}>
                      {t('publier.modifier')}
                    </Texte>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.liste}>
                  {ouverte ? (
                    (() => {
                      const c = categories.donnees.find((x) => x.cle === ouverte)!;
                      return (
                        <>
                          <Pressable onPress={() => setOuverte(null)} accessibilityRole="button" style={[styles.ligne, styles.ligneBord]}>
                            <View style={rtl && { transform: [{ scaleX: -1 }] }}>
                              <IconeRetour couleur={colors.brunMoyen} taille={18} />
                            </View>
                            <Texte poids={600} style={[styles.ligneTexte, { color: colors.brunMoyen }]}>
                              {t('publier.toutesCategories')}
                            </Texte>
                          </Pressable>
                          <Texte variante="titre" poids={700} style={styles.listeTitre}>
                            {nom(c)}
                          </Texte>
                          {c.sous_categories.map((s, k) => (
                            <LigneChoix
                              key={s.id}
                              libelle={nom(s)}
                              choisi={sousCategorie === s.id}
                              dernier={k === c.sous_categories.length - 1}
                              onPress={() => {
                                setSousCategorie(s.id);
                                setListeOuverte(false);
                                setOuverte(null);
                              }}
                            />
                          ))}
                        </>
                      );
                    })()
                  ) : (
                    categories.donnees.map((c, k) => (
                      <LigneChoix
                        key={c.cle}
                        libelle={nom(c)}
                        choisi={cleCategorie === c.cle}
                        suite={c.sous_categories.length > 0}
                        dernier={k === categories.donnees!.length - 1}
                        onPress={() => choisirCategorie(c)}
                      />
                    ))
                  )}
                </View>
              )}
            </View>

            {genre && (
              <View style={styles.bloc}>
                <Libelle>{t('location.typeAnnonce')}</Libelle>
                <View style={styles.rangee}>
                  <Pastille libelle={t('location.vente')} choisi={!enLocation} onPress={() => setEnLocation(false)} largeur />
                  <Pastille libelle={t('location.location')} choisi={enLocation} onPress={() => setEnLocation(true)} largeur />
                </View>
              </View>
            )}

            {estDon && <Texte style={styles.encart}>{t('publier.infoDon')}</Texte>}
          </>
        )}

        {/* ---------- 2. Description ---------- */}
        {etape === 'desc' && categorie && (
          <>
            <View style={styles.bloc}>
              <Champ
                libelle={t('publier.titreAnnonce')}
                placeholder={categorie.titre_exemple[langue] ?? t('publier.titreExempleDefaut')}
                value={titre}
                onChangeText={setTitre}
                maxLength={90}
              />
              <Texte style={styles.aide}>{t('publier.titreAide')}</Texte>
            </View>

            {detectees.length > 0 && <PanneauDetecteur familles={detectees} />}

            {criteres.length > 0 && (
              <View style={styles.bloc}>
                <Texte variante="titre" poids={700} style={styles.section}>
                  {t('publier.caracteristiques')}
                </Texte>
                {criteres.map((c) => (
                  <ChampCritere
                    key={c.cle}
                    critere={c}
                    valeur={carac[c.cle] ?? ''}
                    onChange={(v) => setCarac({ ...carac, [c.cle]: v })}
                  />
                ))}
              </View>
            )}

            <View style={styles.bloc}>
              <Libelle>{t('publier.description')}</Libelle>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('publier.descriptionEx')}
                placeholderTextColor={colors.brunMoyen}
                accessibilityLabel={t('publier.description')}
                multiline
                maxLength={4000}
                textAlignVertical="top"
                style={[
                  styles.zoneTexte,
                  { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' },
                ]}
              />
              <Texte style={styles.aide}>
                {t('publier.descriptionConseil', { conseil: bi(categorie.conseil_description) })}
              </Texte>
            </View>
          </>
        )}

        {/* ---------- 3. État ---------- */}
        {etape === 'etat' && (
          <>
            <Texte style={styles.aide}>{t('publier.etatIntro')}</Texte>
            {ETATS.map((e) => {
              const [libelle, detail] = t(`etats.${e}`, { returnObjects: true }) as unknown as [string, string];
              const choisi = etat === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => setEtat(e)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: choisi }}
                  style={[styles.carteEtat, choisi && styles.carteEtatChoisie]}
                >
                  <View style={[styles.radio, choisi && { borderColor: colors.accent }]}>
                    {choisi && <View style={styles.radioPoint} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texte poids={700} style={{ fontSize: 15 }}>
                      {libelle}
                    </Texte>
                    <Texte style={styles.aide}>{detail}</Texte>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {/* ---------- 4. Photos (étape 5 du plan) ---------- */}
        {etape === 'photos' && <EtapePhotos angles={angles} photos={photos} setPhotos={setPhotos} />}

        {/* ---------- 5. Prix et lieu ---------- */}
        {etape === 'prix' && (
          <>
            {location ? (
              <>
                <View style={styles.bloc}>
                  <Libelle>{t('location.tarifs')}</Libelle>
                  <Texte style={styles.aide}>{t('location.tarifsAide')}</Texte>
                  {unites.map((u) => {
                    const v = lirePrix(tarifsSaisis[u] ?? '');
                    return (
                      <View key={u} style={styles.ligneTarif}>
                        <Texte poids={600} style={{ flex: 1, fontSize: 14 }}>
                          {t(`location.par.${u}`)}
                        </Texte>
                        <View style={{ width: 150, direction: 'ltr' }}>
                          <Champ
                            ltr
                            accessibilityLabel={t(`location.par.${u}`)}
                            placeholder="—"
                            value={v === null ? '' : formaterNombre(v)}
                            onChangeText={(x) => setTarifsSaisis({ ...tarifsSaisis, [u]: x })}
                            keyboardType="number-pad"
                            maxLength={14}
                          />
                        </View>
                        <Texte poids={700} style={{ fontSize: 14 }}>
                          {t('da')}
                        </Texte>
                      </View>
                    );
                  })}
                  <Texte style={styles.aide}>{t('publier.prixRegle', { euro: formaterEuro(1000, taux) })}</Texte>
                  {problemesTarifs.map((m) => (
                    <View key={m} style={styles.alerte} accessibilityRole="alert">
                      <Texte poids={600} style={styles.alerteTexte}>
                        {m}
                      </Texte>
                    </View>
                  ))}
                </View>
                {cleCategorie === 'vehicules' && (
                  <Pressable
                    onPress={() => setPermisExige(!permisExige)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: permisExige }}
                    style={styles.caseLigne}
                  >
                    <View style={[styles.caseCarree, permisExige && { backgroundColor: colors.brun }]}>
                      {permisExige && <IconeCoche couleur={colors.sable1} taille={14} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texte poids={700} style={{ fontSize: 14 }}>
                        {t('permis.exiger')}
                      </Texte>
                      <Texte style={styles.aide}>{t('permis.exigerSous')}</Texte>
                    </View>
                  </Pressable>
                )}
                <View style={styles.bloc}>
                  <Libelle>{t('location.disponibilites')}</Libelle>
                  <Calendrier
                    debut={dispo.debut}
                    fin={dispo.fin}
                    onChange={(debut, fin) => setDispo({ debut, fin })}
                    memeJour
                  />
                  <Texte poids={600} style={styles.apercu}>
                    {!dispo.debut
                      ? t('location.dispoAide')
                      : !dispo.fin
                        ? t('location.dispoDebut', { debut: dateCourte(dispo.debut) })
                        : t('location.dispoDu', { debut: dateCourte(dispo.debut), fin: dateCourte(dispo.fin) })}
                  </Texte>
                </View>
              </>
            ) : estDon ? (
              <View style={styles.encartDon}>
                <Texte variante="titre" poids={700} style={{ fontSize: 22, color: colors.vert }}>
                  {t('publier.gratuit')}
                </Texte>
                <Texte style={styles.aide}>{t('publier.noteDon')}</Texte>
              </View>
            ) : (
              <View style={styles.bloc}>
                <Libelle>{t('publier.prix')}</Libelle>
                <View style={[styles.rangee, { direction: 'ltr' }]}>
                  <Champ
                    ltr
                    accessibilityLabel={t('publier.prix')}
                    placeholder={t('publier.prixEx')}
                    value={prix === null ? '' : formaterNombre(prix)}
                    onChangeText={setPrixSaisi}
                    keyboardType="number-pad"
                    maxLength={16}
                  />
                  <View style={styles.unite}>
                    <Texte poids={700} style={{ fontSize: 15 }}>
                      {t('da')}
                    </Texte>
                  </View>
                </View>
                <Texte poids={600} style={styles.apercu}>
                  {prix === null
                    ? t('publier.prixSaisir')
                    : t('publier.prixAffiche', { prix: formaterNombre(prix), euro: formaterEuro(prix, taux) })}
                </Texte>
                <Texte style={styles.aide}>{t('publier.prixRegle', { euro: formaterEuro(1000, taux) })}</Texte>
                {problemePrix ? (
                  <View style={styles.alerte} accessibilityRole="alert">
                    <Texte poids={600} style={styles.alerteTexte}>
                      {problemePrix}
                    </Texte>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.bloc}>
              <Libelle>{t('publier.wilaya')}</Libelle>
              <Pressable
                onPress={() => setFeuilleWilayas(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.selecteur, pressed && { opacity: 0.8 }]}
              >
                <Texte style={[{ flex: 1, fontSize: 15 }, !w && { color: colors.brunMoyen }]} numberOfLines={1}>
                  {w ? `${numeroWilaya(w.code)} · ${nom(w)}` : t('publier.choisirWilaya')}
                </Texte>
                <IconeChevronBas couleur={colors.brunMoyen} />
              </Pressable>
            </View>
            <Champ
              libelle={t('publier.ville')}
              placeholder={t('publier.villeEx')}
              value={ville}
              onChangeText={setVille}
              maxLength={60}
            />
          </>
        )}

        {/* ---------- 6. Vérification ---------- */}
        {etape === 'recap' && categorie && (
          <>
            <View style={styles.carte}>
              <View style={styles.rangeeEspacee}>
                <Texte variante="titre" poids={700} style={styles.section}>
                  {t('publier.qualite')}
                </Texte>
                <Texte variante="titre" poids={700} style={{ fontSize: 17, writingDirection: 'ltr' }}>
                  {nbOk} / {points.length}
                </Texte>
              </View>
              <View style={styles.jauge}>
                <View
                  style={[
                    styles.jaugePlein,
                    {
                      width: `${Math.round((nbOk / points.length) * 100)}%`,
                      backgroundColor: nbOk === points.length ? colors.vert : nbOk / points.length >= 0.6 ? colors.accent : colors.rouge,
                    },
                  ]}
                />
              </View>
              <Texte style={styles.aide}>{t(nbOk === points.length ? 'publier.qualiteBravo' : 'publier.qualiteConseil')}</Texte>
              {points.map((p) => (
                <Pressable
                  key={p.cle}
                  disabled={p.ok}
                  onPress={() => allerA(etapes.indexOf(pointsEtape[p.cle]))}
                  accessibilityRole="button"
                  style={styles.point}
                >
                  <View style={[styles.puce, p.ok && { backgroundColor: colors.vert, borderColor: colors.vert }]}>
                    {p.ok && <IconeCoche couleur={colors.blanc} taille={11} />}
                  </View>
                  <Texte poids={p.ok ? 400 : 700} style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
                    {t(`publier.points.${p.cle}`)}
                  </Texte>
                  {!p.ok && (
                    <Texte poids={700} style={styles.lienTexte}>
                      {t('publier.ameliorer')}
                    </Texte>
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.carte}>
              <Texte variante="titre" poids={700} style={styles.section}>
                {t('publier.reussir')}
              </Texte>
              {(t('publier.astuces', { returnObjects: true, seuil: reglages.donnees?.seuil_badge ?? 10 }) as unknown as [string, string][]).map(
                ([gras, texte]) => (
                  <Texte key={gras} style={{ fontSize: 13, lineHeight: 20 }}>
                    <Texte poids={700} style={{ fontSize: 13 }}>
                      {gras}
                    </Texte>{' '}
                    {texte}
                  </Texte>
                ),
              )}
            </View>

            <View style={styles.carte}>
              <Texte variante="titre" poids={700} style={styles.section}>
                {t('publier.recapitulatif')}
              </Texte>
              <LigneRecap
                libelle={t('publier.recap.annonceur')}
                valeur={pro ? `${t('publier.professionnel')} · ${nomCommercial.trim()}` : t('publier.particulier')}
              />
              <LigneRecap libelle={t('publier.recap.categorie')} valeur={sous ? `${nom(categorie)} › ${nom(sous)}` : nom(categorie)} />
              <LigneRecap libelle={t('publier.recap.type')} valeur={t(`publier.types.${type}`)} />
              <LigneRecap libelle={t('publier.recap.titre')} valeur={titre.trim()} />
              {avecEtat && etat && (
                <LigneRecap libelle={t('publier.recap.etat')} valeur={(t(`etats.${etat}`, { returnObjects: true }) as unknown as string[])[0]!} />
              )}
              {criteres
                .filter((c) => carac[c.cle]?.trim())
                .map((c) => (
                  <LigneRecap key={c.cle} libelle={bi(c)} valeur={valeurCritere(c, carac[c.cle]!, langue)} />
                ))}
              <LigneRecap
                libelle={t('publier.recap.prix')}
                valeur={
                  location
                    ? tarifs.map((x) => `${formaterNombre(x.prix_da)} ${t('da')} ${t(`location.suffixe.${x.unite}`)}`).join(' · ')
                    : estDon
                      ? t('publier.gratuit')
                      : prix !== null
                        ? `${formaterNombre(prix)} ${t('da')}`
                        : '—'
                }
              />
              {location && cleCategorie === 'vehicules' && permisExige && <LigneRecap libelle={t('permis.titre')} valeur={t('permis.exiger')} />}
              {location && dispo.debut && dispo.fin && (
                <LigneRecap
                  libelle={t('location.disponibilites')}
                  valeur={t('location.du', { debut: dateCourte(dispo.debut), fin: dateCourte(dispo.fin) })}
                />
              )}
              <LigneRecap
                libelle={t('publier.recap.photos')}
                valeur={photos.length ? t('photos.recapPhotos', { count: photos.length }) : t('photos.recapAucune')}
              />
              <LigneRecap libelle={t('publier.recap.lieu')} valeur={[ville.trim(), w ? nom(w) : ''].filter(Boolean).join(langue === 'ar' ? '، ' : ', ')} />
            </View>

            <View style={[styles.conformite, toutEstBon ? styles.conforme : styles.nonConforme]}>
              <Texte poids={700} style={{ fontSize: 12, color: toutEstBon ? colors.sable3 : colors.rouge }}>
                {t('detecteur.titre')}
              </Texte>
              <Texte poids={700} style={{ fontSize: 16, color: toutEstBon ? colors.sable1 : colors.rouge }}>
                {t(toutEstBon ? 'detecteur.conforme' : 'detecteur.nonConforme')}
              </Texte>
              <Texte style={{ fontSize: 13, lineHeight: 19, color: toutEstBon ? colors.sable1 : colors.brun }}>
                {t(toutEstBon ? 'detecteur.conformeTexte' : 'detecteur.nonConformeTexte')}
              </Texte>
            </View>
            <Texte style={styles.aide}>{t('publier.engagement')}</Texte>
            <Pressable onPress={() => router.push('/charte')} accessibilityRole="link" style={styles.lien}>
              <Texte poids={700} style={styles.lienTexte}>
                {t('publier.lireCharte')}
              </Texte>
            </Pressable>
            {erreur && (
              <Texte poids={600} style={styles.erreur} accessibilityLiveRegion="polite">
                {t('publier.erreurEnvoi')}
              </Texte>
            )}
            {erreurPhotos && (
              <Texte poids={600} style={styles.erreur} accessibilityLiveRegion="polite">
                {t('photos.erreurEnvoiPhotos')}
              </Texte>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.bas, { paddingBottom: 12 }]}>
        {bloque[etape] ? (
          <Texte poids={600} style={styles.bloqueTexte}>
            {bloque[etape]}
          </Texte>
        ) : null}
        <View style={styles.rangee}>
          {i > 0 && (
            <View style={{ flex: 1 }}>
              <Bouton libelle={t('publier.precedent')} onPress={() => allerA(i - 1)} variante="contour" />
            </View>
          )}
          <View style={{ flex: i > 0 ? 1.4 : 1 }}>
            {etape === 'recap' ? (
              <Bouton libelle={t('publier.envoyer')} onPress={envoyer} actif={toutEstBon} occupe={occupe} />
            ) : (
              <Bouton libelle={t('publier.suivant')} onPress={suivant} actif={!bloque[etape]} />
            )}
          </View>
        </View>
      </View>

      <FeuilleWilayas visible={feuilleWilayas} valeur={wilaya} onChoisir={setWilaya} onFermer={() => setFeuilleWilayas(false)} />
    </KeyboardAvoidingView>
  );
}

/** Encadré rouge du détecteur de mots : ce qui est interdit, et pourquoi. */
function PanneauDetecteur({ familles }: { familles: { cle: string; effet: string; motif_fr: string; motif_ar: string }[] }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  return (
    <View style={styles.alerte} accessibilityRole="alert">
      <Texte poids={700} style={styles.alerteTexte}>
        {t('detecteur.titre')}
      </Texte>
      {familles.map((f) => (
        <Texte key={f.cle} style={styles.alerteTexte}>
          • {f.effet === 'professionnel' ? t('detecteur.professionnel') : langue === 'ar' ? f.motif_ar : f.motif_fr}
        </Texte>
      ))}
    </View>
  );
}

/** Texte affiché pour la valeur d'une caractéristique (traduit pour les choix). */
function valeurCritere(c: Critere, v: string, langue: 'fr' | 'ar') {
  const o = c.options?.find((x) => x.v === v);
  return o ? o[langue] : v;
}

function EnTetePublier({ titre, sousTitre, progression }: { titre: string; sousTitre?: string; progression?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.entete, { paddingTop: insets.top + 18 }]}>
      <Texte variante="titre" poids={700} style={styles.enteteTitre} accessibilityRole="header">
        {titre}
      </Texte>
      {sousTitre ? <Texte style={styles.enteteSous}>{sousTitre}</Texte> : null}
      {progression !== undefined && (
        <View style={styles.progression}>
          <View style={[styles.progressionPlein, { width: `${Math.round(progression * 100)}%` }]} />
        </View>
      )}
    </View>
  );
}

function ChampCritere({ critere, valeur, onChange }: { critere: Critere; valeur: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  if (critere.type === 'choix' && critere.options) {
    return (
      <View style={styles.bloc}>
        <Libelle>{critere[langue]}</Libelle>
        <View style={styles.grille}>
          {critere.options.map((o) => (
            <Pastille key={o.v} libelle={o[langue]} choisi={valeur === o.v} onPress={() => onChange(valeur === o.v ? '' : o.v)} />
          ))}
        </View>
      </View>
    );
  }
  const nombre = critere.type === 'nombre';
  return (
    <Champ
      libelle={critere[langue]}
      placeholder={t('publier.facultatif')}
      value={valeur}
      onChangeText={(v) => onChange(nombre ? v.replace(/\D/g, '').slice(0, 9) : v)}
      keyboardType={nombre ? 'number-pad' : 'default'}
      ltr={nombre}
      maxLength={nombre ? 9 : 80}
    />
  );
}

function LigneChoix({
  libelle,
  choisi,
  suite,
  dernier,
  onPress,
}: {
  libelle: string;
  choisi: boolean;
  suite?: boolean;
  dernier?: boolean;
  onPress: () => void;
}) {
  const { rtl } = usePreferences();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: choisi }}
      style={({ pressed }) => [styles.ligne, !dernier && styles.ligneBord, pressed && { opacity: 0.7 }]}
    >
      <Texte poids={choisi ? 700 : 400} style={styles.ligneTexte}>
        {libelle}
      </Texte>
      {choisi && !suite && <IconeCoche couleur={colors.accent} taille={18} epaisseur={2.6} />}
      {suite && (
        <View style={!rtl && { transform: [{ scaleX: -1 }] }}>
          <IconeRetour couleur={colors.brunMoyen} taille={18} />
        </View>
      )}
    </Pressable>
  );
}

function LigneRecap({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={styles.ligneRecap}>
      <Texte style={styles.recapLibelle}>{libelle}</Texte>
      <Texte poids={600} style={styles.recapValeur}>
        {valeur || '—'}
      </Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  enteteTitre: { fontSize: 22, color: colors.sable1 },
  enteteSous: { fontSize: 13, color: colors.sable3 },
  progression: { height: 6, borderRadius: 3, backgroundColor: colors.brunMoyen, overflow: 'hidden', marginTop: 4 },
  progressionPlein: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  contenu: { padding: 20, gap: 16, paddingBottom: 32 },
  conseil: {
    backgroundColor: colors.vertFond,
    borderWidth: 1,
    borderColor: colors.vertBord,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  conseilTitre: { fontSize: 14, color: colors.vert },
  conseilTexte: { fontSize: 13, lineHeight: 20 },
  bloc: { gap: 8 },
  rangee: { flexDirection: 'row', gap: 10 },
  rangeeEspacee: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demi: { width: '48%', flexGrow: 1 },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  section: { fontSize: 16 },
  choix: {
    ...styleChamp,
    height: undefined,
    minHeight: 56,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lien: { minHeight: toucheMin, justifyContent: 'center', alignSelf: 'flex-start' },
  lienTexte: { fontSize: 13, textDecorationLine: 'underline', color: colors.accentFonce },
  liste: { backgroundColor: colors.carte, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.sable2 },
  listeTitre: { fontSize: 15, paddingTop: 12, paddingBottom: 4 },
  ligne: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ligneBord: { borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  ligneTexte: { flex: 1, fontSize: 15 },
  encart: { fontSize: 14, lineHeight: 21, backgroundColor: colors.sable2, borderRadius: 14, padding: 16 },
  encartDon: { gap: 6, backgroundColor: colors.vertFond, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.vertBord },
  zoneTexte: { ...styleChamp, height: 140, paddingTop: 12, fontSize: 15, color: colors.brun },
  carteEtat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
  },
  carteEtatChoisie: { borderWidth: 2, borderColor: colors.accent },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sable4, alignItems: 'center', justifyContent: 'center' },
  radioPoint: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  caseLigne: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
  },
  caseCarree: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.brun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ligneTarif: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unite: { ...styleChamp, backgroundColor: colors.sable2, justifyContent: 'center' },
  apercu: { fontSize: 13 },
  conformite: { borderRadius: 14, padding: 14, gap: 4 },
  conforme: { backgroundColor: colors.brun },
  nonConforme: { backgroundColor: colors.rougeFond, borderWidth: 1, borderColor: colors.rouge },
  alerte: { gap: 4, backgroundColor: colors.rougeFond, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.rouge },
  alerteTexte: { fontSize: 13, lineHeight: 19, color: colors.rouge },
  selecteur: { ...styleChamp, flexDirection: 'row', alignItems: 'center', gap: 10 },
  carte: { backgroundColor: colors.carte, borderRadius: 16, padding: 16, gap: 10 },
  jauge: { height: 8, borderRadius: 4, backgroundColor: colors.sable2, overflow: 'hidden' },
  jaugePlein: { height: 8, borderRadius: 4 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  puce: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.sable3, alignItems: 'center', justifyContent: 'center' },
  ligneRecap: { flexDirection: 'row', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  recapLibelle: { width: '38%', fontSize: 13, color: colors.brunMoyen },
  recapValeur: { flex: 1, fontSize: 13 },
  erreur: { fontSize: 13, lineHeight: 20, color: colors.rouge },
  bas: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.sable2, backgroundColor: colors.blanc },
  bloqueTexte: { fontSize: 13, textAlign: 'center', color: colors.brunMoyen },
  succes: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 },
  succesRond: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.vert, alignItems: 'center', justifyContent: 'center' },
  succesTitre: { fontSize: 22, textAlign: 'center' },
  succesTexte: { fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.brunMoyen },
});
