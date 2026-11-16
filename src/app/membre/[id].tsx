import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { CarteAnnonce } from '@/components/annonces/CarteAnnonce';
import { BadgeValide } from '@/components/confiance/BadgeValide';
import { Etoiles } from '@/components/confiance/Etoiles';
import { FeuilleConfirmation } from '@/components/confiance/FeuilleConfirmation';
import { FeuilleSignalement } from '@/components/confiance/FeuilleSignalement';
import { annoncesDuMembre, type ActivitePro, type AnnonceResume, type TypeAnnonce } from '@/lib/annonces';
import { BanniereVitrine } from '@/components/BanniereVitrine';
import { Pastille } from '@/components/Pastille';
import { useAuth } from '@/lib/auth';
import { avisRecus, bloquer, debloquer, estBloque, statsMembre, type Avis, type StatsMembre } from '@/lib/confiance';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre } from '@/lib/prix';
import { useCategories, useReglages, useWilayas } from '@/lib/referentiel';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

type Membre = {
  id: string;
  nom_affiche: string;
  avatar: number | null;
  est_pro: boolean;
  nom_commercial: string | null;
  activite_pro: ActivitePro | null;
  wilaya_code: number | null;
  ville: string | null;
  cree_le: string;
};

/** Profil public d'un membre : notes, avis, progression du badge « Vendeur validé », ses annonces, signaler / bloquer. */
export default function ProfilMembre() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const { langue } = usePreferences();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const { donnees: reglages } = useReglages();

  const [membre, setMembre] = useState<Membre | null>(null);
  const [stats, setStats] = useState<StatsMembre | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceResume[]>([]);
  const [erreur, setErreur] = useState(false);
  const [jeBloque, setJeBloque] = useState(false);
  const [feuille, setFeuille] = useState<null | 'signaler' | 'bloquer'>(null);
  const [typeChoisi, setTypeChoisi] = useState<TypeAnnonce | null>(null);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [m, s, a, l] = await Promise.all([
        supabase.from('profiles').select('id, nom_affiche, avatar, est_pro, nom_commercial, activite_pro, wilaya_code, ville, cree_le').eq('id', String(id)).maybeSingle(),
        statsMembre(String(id)),
        avisRecus(String(id)),
        annoncesDuMembre(String(id)),
      ]);
      if (m.error) throw m.error;
      setMembre(m.data as Membre | null);
      setStats(s);
      setAvis(a);
      setAnnonces(l);
      if (profil && profil.id !== id) setJeBloque(await estBloque(profil.id, String(id)));
    } catch {
      setErreur(true);
    }
  }, [id, profil]);

  useEffect(() => {
    charger();
  }, [charger]);

  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const nom = membre ? (membre.est_pro && membre.nom_commercial ? membre.nom_commercial : membre.nom_affiche) : '';
  const autreMembre = !!profil && !!membre && profil.id !== membre.id;

  if (!membre || !stats) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('confiance.profilVendeur')} />
        <EtatChargement erreur={erreur} reessayer={charger} />
      </View>
    );
  }

  const valide = stats.ventes_5 >= stats.seuil;
  const reste = Math.max(0, stats.seuil - stats.ventes_5);
  const depuis = new Date(membre.cree_le);
  const dec = (v: number | null) => (v == null ? '–' : formaterNombre(Math.round(v * 10) / 10).replace('.', ','));
  const blocsCriteres = [
    { titre: t('confiance.commeVendeur'), m: stats.comme_vendeur, cles: ['conforme', 'ponctualite', 'comportement'] as const },
    { titre: t('confiance.commeAcheteur'), m: stats.comme_acheteur, cles: ['ponctualite', 'paiement', 'comportement'] as const },
  ].filter((b) => b.m.nb > 0);

  const vitrine = membre.est_pro;
  const w = wilayas?.find((x) => x.code === membre.wilaya_code);
  const lieu = [membre.ville, w ? (langue === 'ar' ? w.nom_ar : w.nom_fr) : ''].filter(Boolean).join(langue === 'ar' ? '، ' : ', ');
  const types = [...new Set(annonces.map((a) => a.type))];
  const affichees = typeChoisi ? annonces.filter((a) => a.type === typeChoisi) : annonces;

  return (
    <View style={styles.ecran}>
      {vitrine ? <BanniereVitrine /> : <EnTeteRetour titre={t('confiance.profilVendeur')} />}
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.identite}>
          <ImageProfil numero={membre.avatar} taille={72} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texte variante="titre" poids={700} style={{ fontSize: 22 }}>
              {nom}
            </Texte>
            {vitrine && (
              <Texte poids={600} style={styles.secondaire}>
                {[membre.activite_pro ? t(`publier.activites.${membre.activite_pro}`) : t('vitrine.verifie'), lieu].filter(Boolean).join(' · ')}
              </Texte>
            )}
            {valide ? <BadgeValide /> : !vitrine && <Texte style={styles.secondaire}>{t('confiance.membre')}</Texte>}
            <Texte style={styles.secondaire}>{t('fiche.membreDepuis', { date: `${mois[depuis.getMonth()]} ${depuis.getFullYear()}` })}</Texte>
          </View>
        </View>

        <View style={styles.stats}>
          {[
            { v: stats.nb_avis ? `${dec(stats.moyenne)} ★` : '–', l: t('confiance.noteMoyenne') },
            { v: String(stats.nb_avis), l: t('confiance.avisRecus') },
            { v: String(stats.ventes_5), l: t('confiance.ventes5') },
          ].map((s) => (
            <View key={s.l} style={styles.stat}>
              <Texte variante="titre" poids={700} style={{ fontSize: 20, writingDirection: 'ltr' }}>
                {s.v}
              </Texte>
              <Texte style={{ fontSize: 12, color: colors.brunMoyen, textAlign: 'center' }}>{s.l}</Texte>
            </View>
          ))}
        </View>

        <View style={[styles.badgeBloc, valide && styles.badgeBlocValide]}>
          <View style={styles.barre} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: stats.seuil, now: Math.min(stats.ventes_5, stats.seuil) }}>
            <View style={[styles.rempli, { width: `${Math.min(100, Math.round((stats.ventes_5 / Math.max(1, stats.seuil)) * 100))}%` }]} />
          </View>
          <Texte style={{ fontSize: 13, lineHeight: 19 }}>
            {valide ? t('confiance.badgeObtenu', { seuil: stats.seuil }) : t('confiance.badgeReste', { count: reste })}
          </Texte>
        </View>

        {blocsCriteres.length > 0 && (
          <View style={{ gap: 10 }}>
            <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
              {t('confiance.parCritere')}
            </Texte>
            {blocsCriteres.map((b) => (
              <View key={b.titre} style={styles.carte}>
                {blocsCriteres.length > 1 && (
                  <Texte poids={700} style={{ fontSize: 13, color: colors.brunMoyen }}>
                    {b.titre}
                  </Texte>
                )}
                {b.cles.map((c, i) => {
                  const v = [b.m.c1, b.m.c2, b.m.c3][i];
                  return (
                    <View key={c} style={{ gap: 4 }}>
                      <View style={styles.ligne}>
                        <Texte style={{ flex: 1, fontSize: 14 }}>{t(`confiance.criteres.${c}`)}</Texte>
                        <Texte poids={700} style={{ fontSize: 14, writingDirection: 'ltr' }}>
                          {v == null ? '–' : `${dec(v)} / 5`}
                        </Texte>
                      </View>
                      <View style={styles.barreFine}>
                        <View style={[styles.rempliFin, { width: `${Math.round(((v ?? 0) / 5) * 100)}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
            {t('confiance.avisRecents')}
          </Texte>
          {avis.length === 0 ? (
            <Texte style={styles.secondaire}>{t('confiance.pasAvis')}</Texte>
          ) : (
            avis.map((a) => {
              const d = new Date(a.cree_le);
              return (
                <View key={a.id} style={[styles.carte, styles.avis]}>
                  <ImageProfil numero={a.auteur?.avatar} taille={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texte poids={700} style={{ fontSize: 14 }}>
                      {a.auteur?.nom_affiche ?? t('confiance.ancienMembre')}
                    </Texte>
                    <Texte style={{ fontSize: 12, color: colors.brunMoyen }}>
                      {a.role === 'acheteur' ? t('confiance.deLAcheteur') : t('confiance.duVendeur')} · {d.getDate()} {mois[d.getMonth()]} {d.getFullYear()}
                    </Texte>
                  </View>
                  <Etoiles valeur={a.note} taille={14} />
                </View>
              );
            })
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
            {t('confiance.sesAnnonces')}
          </Texte>
          {vitrine && types.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pastille libelle={t('vitrine.toutes')} choisi={!typeChoisi} onPress={() => setTypeChoisi(null)} />
              {types.map((ty) => (
                <Pastille key={ty} libelle={t(`publier.types.${ty}`)} choisi={typeChoisi === ty} onPress={() => setTypeChoisi(ty)} />
              ))}
            </View>
          )}
          {affichees.length === 0 ? (
            <Texte style={styles.secondaire}>{t('confiance.aucuneAnnonce')}</Texte>
          ) : (
            <View style={styles.grille}>
              {affichees.map((a) => (
                <View key={a.id} style={styles.case}>
                  <CarteAnnonce
                    annonce={a}
                    categorie={categories.donnees?.find((c) => c.cle === a.categorie)}
                    wilaya={wilayas?.find((w) => w.code === a.wilaya_code)}
                    taux={reglages?.taux_dinar_euro ?? 0.0037}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {autreMembre && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Bouton libelle={t('confiance.signalerMembre')} onPress={() => setFeuille('signaler')} variante="contour" />
            {jeBloque ? (
              <Bouton
                libelle={t('confiance.debloquer')}
                onPress={async () => {
                  if (await debloquer(profil.id, membre.id)) setJeBloque(false);
                }}
                variante="contour"
              />
            ) : (
              <Bouton libelle={t('confiance.bloquerMembre')} onPress={() => setFeuille('bloquer')} variante="danger" />
            )}
          </View>
        )}
        {!profil && (
          <Bouton libelle={t('compte.seConnecter')} onPress={() => router.push('/compte')} variante="sombre" />
        )}
      </ScrollView>

      <FeuilleSignalement
        visible={feuille === 'signaler'}
        signalement={{ genre: 'membre', membreViseId: membre.id }}
        nom={nom}
        onFermer={() => setFeuille(null)}
        onBloquer={jeBloque ? undefined : () => setFeuille('bloquer')}
      />
      <FeuilleConfirmation
        visible={feuille === 'bloquer'}
        titre={t('confiance.bloquerQ', { nom })}
        texte={t('confiance.bloquerTexte')}
        libelle={t('confiance.bloquer')}
        danger
        onConfirmer={async () => {
          if (profil && (await bloquer(profil.id, membre.id))) setJeBloque(true);
          setFeuille(null);
        }}
        onFermer={() => setFeuille(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 20 },
  identite: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  secondaire: { fontSize: 13, color: colors.brunMoyen },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.carte },
  badgeBloc: { gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.sable2 },
  badgeBlocValide: { backgroundColor: colors.vertFond, borderColor: colors.vertBord },
  barre: { height: 8, borderRadius: 4, backgroundColor: colors.sable2, overflow: 'hidden' },
  rempli: { height: 8, borderRadius: 4, backgroundColor: colors.vert },
  titre: { fontSize: 17 },
  carte: { padding: 14, borderRadius: 14, backgroundColor: colors.carte, gap: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barreFine: { height: 6, borderRadius: 3, backgroundColor: colors.sable2, overflow: 'hidden' },
  rempliFin: { height: 6, borderRadius: 3, backgroundColor: colors.sable4 },
  avis: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  case: { width: '50%', padding: 6 },
});
