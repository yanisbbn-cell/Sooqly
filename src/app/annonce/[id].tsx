import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BlocLocation } from '@/components/annonces/BlocLocation';
import { Galerie } from '@/components/annonces/Galerie';
import { couleursTuile } from '@/components/annonces/tuile';
import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCategorie } from '@/components/IconeCategorie';
import { IconeRetour } from '@/components/Icones';
import { ImageProfil } from '@/components/ImageProfil';
import { BadgeValide } from '@/components/confiance/BadgeValide';
import { FeuilleSignalement } from '@/components/confiance/FeuilleSignalement';
import { Texte } from '@/components/Texte';
import { estSponsorisee, lireAnnonce, refuserAnnonce, validerAnnonce, type Annonce } from '@/lib/annonces';
import { estModerateur, useAuth } from '@/lib/auth';
import { statsMembre, type StatsMembre } from '@/lib/confiance';
import { usePreferences } from '@/lib/preferences';
import { formaterEuro, formaterNombre } from '@/lib/prix';
import { useCategories, useReglages, useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

const ORDRE_UNITES = ['nuit', 'jour', 'semaine', 'mois', '6_mois', 'an'];

/** Fiche d'une annonce. */
export default function FicheAnnonce() {
  const { id, debut, fin } = useLocalSearchParams<{ id: string; debut?: string; fin?: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue, rtl } = usePreferences();
  const { profil } = useAuth();
  const { donnees: categories } = useCategories();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();

  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined);
  const [erreur, setErreur] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [statsVendeur, setStatsVendeur] = useState<StatsMembre | null>(null);
  const [signaler, setSignaler] = useState(false);
  const [signalee, setSignalee] = useState(false);

  const auteurId = annonce?.auteur_id;
  useEffect(() => {
    if (auteurId) statsMembre(auteurId).then(setStatsVendeur, () => setStatsVendeur(null));
  }, [auteurId]);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setAnnonce(await lireAnnonce(String(id)));
    } catch {
      setErreur(true);
    }
  }, [id]);
  useEffect(() => {
    charger();
  }, [charger]);

  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const boutonRetour = (
    <Pressable
      onPress={retour}
      accessibilityRole="button"
      accessibilityLabel={t('fiche.retour')}
      style={[styles.retour, { top: insets.top + 10 }]}
    >
      <View style={rtl && { transform: [{ scaleX: -1 }] }}>
        <IconeRetour couleur={colors.sable1} />
      </View>
    </Pressable>
  );

  if (annonce === undefined || annonce === null) {
    return (
      <View style={[styles.ecran, { paddingTop: insets.top + 64 }]}>
        {annonce === null ? (
          <Texte style={styles.introuvable}>{t('fiche.introuvable')}</Texte>
        ) : (
          <EtatChargement erreur={erreur} reessayer={charger} />
        )}
        <View style={[styles.retourFond, { top: insets.top + 10 }]}>{boutonRetour}</View>
      </View>
    );
  }

  const a = annonce;
  const categorie = categories?.find((c) => c.cle === a.categorie);
  const sous = categorie?.sous_categories.find((s) => s.id === a.sous_categorie_id);
  const wilaya = wilayas?.find((w) => w.code === a.wilaya_code);
  const tuile = couleursTuile(categorie?.icone ?? 'grid');
  const don = a.type === 'don';
  const taux = reglages?.taux_dinar_euro ?? 0.0037;
  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const depuis = a.auteur ? new Date(a.auteur.cree_le) : null;
  const caracteristiques = (categorie?.criteres ?? []).filter((c) => a.caracteristiques?.[c.cle]);
  const visibleParTous = a.statut === 'en_ligne' || a.statut === 'reserve';
  const premierTarif = [...(a.tarifs ?? [])].sort((x, y) => ORDRE_UNITES.indexOf(x.unite) - ORDRE_UNITES.indexOf(y.unite))[0];

  return (
    <View style={styles.ecran}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {a.photos?.length ? (
          <Galerie photos={a.photos} hauteur={300 + insets.top} moderation={estModerateur(profil)} />
        ) : (
          <View style={[styles.tuile, { backgroundColor: tuile.fond, paddingTop: insets.top }]}>
            <IconeCategorie icone={categorie?.icone ?? 'grid'} couleur={tuile.trait} taille={72} />
          </View>
        )}

        <View style={styles.contenu}>
          {confirmation && (
            <View style={styles.confirmation} accessibilityLiveRegion="polite">
              <Texte poids={700} style={{ fontSize: 14, color: colors.vert }}>
                {confirmation}
              </Texte>
            </View>
          )}

          {!visibleParTous && (
            <View style={[styles.bandeau, a.statut === 'refuse' && { backgroundColor: colors.rougeFond, borderColor: colors.rouge }]}>
              <Texte poids={600} style={{ fontSize: 13, lineHeight: 19 }}>
                {t(`fiche.statut.${a.statut as 'verification' | 'refuse' | 'expire' | 'vendu' | 'loue'}`)}
              </Texte>
              {a.motif_refus ? <Texte style={{ fontSize: 13 }}>{t('fiche.motif', { motif: a.motif_refus })}</Texte> : null}
            </View>
          )}

          <View style={styles.pastilles}>
            <View style={styles.pastilleSombre}>
              <Texte poids={600} style={{ fontSize: 12, color: colors.sable1 }}>
                {t(`publier.types.${a.type}`)}
              </Texte>
            </View>
            {a.statut === 'reserve' && (
              <View style={styles.pastilleClaire}>
                <Texte poids={600} style={{ fontSize: 12 }}>
                  {t('fiche.statut.reserve')}
                </Texte>
              </View>
            )}
            {a.auteur?.est_pro && (
              <View style={styles.pastilleContour}>
                <Texte poids={700} style={{ fontSize: 12 }}>
                  {t('fiche.professionnel')}
                </Texte>
              </View>
            )}
            {estSponsorisee(a) && (
              <Texte poids={600} style={{ fontSize: 12, color: colors.brunMoyen }}>
                {t('carte.sponsorise')}
              </Texte>
            )}
          </View>

          {categorie && (
            <Texte poids={600} style={styles.fil}>
              {sous ? `${nom(categorie)} › ${nom(sous)}` : nom(categorie)}
            </Texte>
          )}
          <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
            {a.titre}
          </Texte>
          <View>
            <Texte variante="titre" poids={700} style={styles.prix}>
              {don ? t('carte.gratuit') : `${formaterNombre(a.prix_da)} ${t('da')}`}
              {a.type === 'location' && premierTarif && (
                <Texte poids={600} style={{ fontSize: 16, color: colors.brunMoyen }}>
                  {` ${t(`location.suffixe.${premierTarif.unite}`)}`}
                </Texte>
              )}
            </Texte>
            {!don && <Texte style={styles.secondaire}>{formaterEuro(a.prix_da, taux)}</Texte>}
          </View>

          {a.etat && (
            <View style={styles.encadre}>
              <Texte poids={700} style={styles.etiquette}>
                {t('fiche.etat')}
              </Texte>
              <Texte poids={700} style={{ fontSize: 14 }}>
                {(t(`etats.${a.etat}`, { returnObjects: true }) as unknown as string[])[0]}
              </Texte>
            </View>
          )}

          {caracteristiques.length > 0 && (
            <View style={styles.carte}>
              <Texte poids={700} style={styles.etiquette}>
                {t('fiche.caracteristiques')}
              </Texte>
              {caracteristiques.map((c) => {
                const v = String(a.caracteristiques[c.cle]);
                const o = c.options?.find((x) => x.v === v);
                return (
                  <View key={c.cle} style={styles.ligneCarac}>
                    <Texte style={[styles.secondaire, { flex: 1 }]}>{c[langue]}</Texte>
                    <Texte poids={600} style={{ fontSize: 14, flex: 1 }}>
                      {o ? o[langue] : v}
                    </Texte>
                  </View>
                );
              })}
            </View>
          )}

          <Texte style={styles.secondaire}>
            {[a.ville, wilaya ? nom(wilaya) : null].filter(Boolean).join(langue === 'ar' ? '، ' : ', ')}
          </Texte>

          {a.description ? <Texte style={styles.description}>{a.description}</Texte> : null}

          {a.type === 'location' && (a.tarifs?.length ?? 0) > 0 && (
            <BlocLocation
              tarifs={a.tarifs ?? []}
              periodes={a.disponibilites ?? []}
              vehicule={a.categorie === 'vehicules'}
              taux={taux}
              debutInitial={debut}
              finInitiale={fin}
            />
          )}

          {a.auteur && (
            <Pressable
              onPress={() => router.push({ pathname: '/membre/[id]', params: { id: a.auteur_id } })}
              accessibilityRole="button"
              accessibilityHint={t('confiance.voirProfil')}
              style={({ pressed }) => [styles.vendeur, pressed && { opacity: 0.85 }]}
            >
              <ImageProfil numero={a.auteur.avatar} taille={48} />
              <View style={{ flex: 1, gap: 3 }}>
                <Texte poids={700} style={{ fontSize: 15 }}>
                  {a.auteur.est_pro && a.auteur.nom_commercial ? a.auteur.nom_commercial : a.auteur.nom_affiche}
                </Texte>
                {statsVendeur && statsVendeur.ventes_5 >= statsVendeur.seuil && <BadgeValide />}
                {statsVendeur && (
                  <Texte style={styles.secondaire}>
                    {statsVendeur.nb_avis
                      ? `${String(statsVendeur.moyenne).replace('.', ',')} ★ · ${t('confiance.ventes5Court', { count: statsVendeur.ventes_5 })}`
                      : t('confiance.pasAvis')}
                  </Texte>
                )}
                {depuis && (
                  <Texte style={styles.secondaire}>
                    {t('fiche.membreDepuis', { date: `${mois[depuis.getMonth()]} ${depuis.getFullYear()}` })}
                  </Texte>
                )}
              </View>
              <View style={rtl ? undefined : { transform: [{ scaleX: -1 }] }}>
                <IconeRetour couleur={colors.brunMoyen} taille={18} />
              </View>
            </Pressable>
          )}

          {a.type === 'location' && a.categorie === 'vehicules' && a.permis_exige && (
            <View style={styles.permis}>
              <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
                {t('permis.titre')}
              </Texte>
              <Texte style={{ fontSize: 13, lineHeight: 20, color: colors.brunMoyen }}>
                {profil?.id === a.auteur_id
                  ? t('permis.infoLoueur')
                  : t('permis.info', { loueur: a.auteur?.est_pro && a.auteur.nom_commercial ? a.auteur.nom_commercial : (a.auteur?.nom_affiche ?? '') })}
              </Texte>
              {profil && profil.id !== a.auteur_id && visibleParTous && (
                <Bouton libelle={t('permis.envoyer')} onPress={() => router.push({ pathname: '/permis/[id]', params: { id: a.id } })} variante="sombre" />
              )}
            </View>
          )}

          {visibleParTous &&
            (profil?.id === a.auteur_id ? (
              <Texte style={[styles.secondaire, { textAlign: 'center' }]}>{t('messagerie.votreAnnonce')}</Texte>
            ) : (
              <Bouton
                libelle={
                  profil
                    ? t(a.type === 'location' ? 'messagerie.contacterLoueur' : 'messagerie.contacterVendeur')
                    : t('messagerie.connexionContact')
                }
                onPress={() => (profil ? router.push({ pathname: '/contacter/[id]', params: { id: a.id } }) : router.navigate('/compte'))}
                grand
              />
            ))}

          {profil && profil.id !== a.auteur_id && visibleParTous && (
            <Pressable
              onPress={() => !signalee && setSignaler(true)}
              disabled={signalee}
              accessibilityRole="button"
              style={styles.signaler}
            >
              <Texte poids={600} style={{ fontSize: 13, color: signalee ? colors.vert : colors.brunMoyen, textDecorationLine: signalee ? 'none' : 'underline' }}>
                {signalee ? t('confiance.annonceSignalee') : t('confiance.signalerAnnonce')}
              </Texte>
            </Pressable>
          )}

          {estModerateur(profil) && a.statut === 'verification' && (
            <PanneauModeration
              annonce={a}
              dureeJours={reglages?.duree_vie_annonce_jours ?? 60}
              onFait={(message) => {
                setConfirmation(message);
                charger();
              }}
            />
          )}
        </View>
      </ScrollView>
      {boutonRetour}
      <FeuilleSignalement
        visible={signaler}
        signalement={{ genre: 'annonce', annonceId: a.id }}
        onFermer={() => setSignaler(false)}
        onEnvoye={() => setSignalee(true)}
      />
    </View>
  );
}

/** Boutons Valider / Refuser pour un modérateur (outil provisoire jusqu'à l'étape 12). */
function PanneauModeration({
  annonce,
  dureeJours,
  onFait,
}: {
  annonce: Annonce;
  dureeJours: number;
  onFait: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const agir = async (action: () => Promise<boolean>, succes: string) => {
    setOccupe(true);
    const ok = await action();
    setOccupe(false);
    if (ok) onFait(succes);
    else setMessage(t('moderation.erreur'));
  };

  return (
    <View style={styles.moderation}>
      <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
        {t('moderation.panneau')}
      </Texte>
      <Texte style={styles.secondaire}>{t('moderation.provisoire')}</Texte>
      {message && (
        <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }}>
          {message}
        </Texte>
      )}
      {!refus ? (
        <>
          <Bouton
            libelle={t('moderation.valider')}
            onPress={() => agir(() => validerAnnonce(annonce.id, dureeJours), t('moderation.validee'))}
            occupe={occupe}
          />
          <Bouton libelle={t('moderation.refuser')} onPress={() => setRefus(true)} variante="contour" />
        </>
      ) : (
        <>
          <Champ libelle={t('moderation.motifChamp')} placeholder={t('moderation.motifEx')} value={motif} onChangeText={setMotif} maxLength={200} />
          <Pressable
            onPress={() => agir(() => refuserAnnonce(annonce.id, motif), t('moderation.refusee'))}
            accessibilityRole="button"
            disabled={occupe}
            style={({ pressed }) => [styles.refuser, pressed && { opacity: 0.8 }]}
          >
            <Texte poids={700} style={{ color: colors.blanc, fontSize: 15, textAlign: 'center' }}>
              {t('moderation.confirmerRefus')}
            </Texte>
          </Pressable>
          <Bouton libelle={t('moderation.annuler')} onPress={() => setRefus(false)} variante="contour" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  tuile: { height: 230, alignItems: 'center', justifyContent: 'center' },
  retour: {
    position: 'absolute',
    start: 12,
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    backgroundColor: colors.brun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retourFond: { position: 'absolute', start: 0 },
  introuvable: { fontSize: 15, lineHeight: 22, padding: 20, color: colors.brunMoyen },
  contenu: { padding: 20, gap: 12 },
  confirmation: { padding: 12, borderRadius: 12, backgroundColor: colors.vertFond, borderWidth: 1, borderColor: colors.vertBord },
  bandeau: { padding: 12, borderRadius: 12, backgroundColor: colors.sable1, borderWidth: 1, borderColor: colors.sable3, gap: 4 },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pastilleSombre: { backgroundColor: colors.brun, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pastilleClaire: { backgroundColor: colors.sable2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pastilleContour: { borderWidth: 1.5, borderColor: colors.brun, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  fil: { fontSize: 12, color: colors.brunMoyen },
  titre: { fontSize: 23, lineHeight: 30 },
  prix: { fontSize: 30 },
  secondaire: { fontSize: 13, color: colors.brunMoyen },
  encadre: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    gap: 2,
  },
  etiquette: { fontSize: 12, color: colors.brunMoyen },
  carte: { backgroundColor: colors.carte, borderRadius: 14, padding: 14, gap: 6 },
  ligneCarac: { flexDirection: 'row', gap: 12 },
  description: { fontSize: 15, lineHeight: 25 },
  signaler: { alignSelf: 'center', minHeight: toucheMin, justifyContent: 'center', paddingHorizontal: 12 },
  vendeur: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.carte },
  permis: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: colors.carte },
  moderation: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.sable3 },
  refuser: {
    minHeight: toucheMin + 4,
    borderRadius: 12,
    backgroundColor: colors.rouge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
