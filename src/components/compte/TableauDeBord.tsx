import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconeRetour } from '@/components/Icones';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { estModerateur, useAuth, type Profil } from '@/lib/auth';
import { mesAlertes } from '@/lib/alertes';
import { VERSION_TEST } from '@/lib/retours';
import { transactionsANoter } from '@/lib/confiance';
import { nombreDocumentsEnAttente } from '@/lib/permis';
import { usePreferences } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';
import { useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

import { CartePartage } from './CartePartage';
import { FeuilleImagesProfil } from './FeuilleImagesProfil';

/** Écran Compte d'un membre connecté. Les blocs annonces, favoris et alertes arrivent aux étapes suivantes. */
export function TableauDeBord({ profil }: { profil: Profil }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue, changerLangue, revoirAccueil } = usePreferences();
  const { changerAvatar, deconnecter } = useAuth();
  const { donnees: wilayas } = useWilayas();
  const [feuilleImages, setFeuilleImages] = useState(false);
  const [demandeDeconnexion, setDemandeDeconnexion] = useState(false);
  const [documents, setDocuments] = useState(0);
  const [aNoter, setANoter] = useState(0);
  const [enLigne, setEnLigne] = useState(0);
  const [nouvellesAlertes, setNouvellesAlertes] = useState(0);
  useFocusEffect(
    useCallback(() => {
      nombreDocumentsEnAttente(profil.id).then(setDocuments);
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('auteur_id', profil.id)
        .eq('statut', 'en_ligne')
        .then(({ count }) => setEnLigne(count ?? 0));
      mesAlertes().then(
        (l) => setNouvellesAlertes(l.filter((a) => a.notifications).reduce((n, a) => n + a.nouvelles_annonces, 0)),
        () => setNouvellesAlertes(0),
      );
      transactionsANoter().then((l) => setANoter(l.filter((x) => !x.note_id).length), () => setANoter(0));
    }, [profil.id]),
  );

  const w = wilayas?.find((x) => x.code === profil.wilaya_code);
  const lieu = [profil.ville, w ? (langue === 'ar' ? w.nom_ar : w.nom_fr) : null].filter(Boolean).join(langue === 'ar' ? '، ' : ', ');

  return (
    <View style={styles.ecran}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.entete, { paddingTop: insets.top + 22 }]}>
          <Pressable
            onPress={() => setFeuilleImages(true)}
            accessibilityRole="button"
            accessibilityLabel={t('compte.changerImage')}
            style={({ pressed }) => pressed && { opacity: 0.8 }}
          >
            <ImageProfil numero={profil.avatar} taille={64} />
          </Pressable>
          <View style={styles.enteteTexte}>
            <Texte variante="titre" poids={700} style={styles.nom} accessibilityRole="header">
              {profil.nom_affiche}
            </Texte>
            {lieu ? <Texte style={styles.lieu}>{lieu}</Texte> : null}
            {profil.telephone_verifie && (
              <View style={styles.verifie}>
                <View style={styles.point} />
                <Texte poids={600} style={styles.verifieTexte}>
                  {t('compte.membreVerifie')}
                </Texte>
              </View>
            )}
          </View>
        </View>

        <View style={styles.contenu}>
          {profil.suspendu && (
            <View style={styles.suspendu} accessibilityRole="alert">
              <Texte poids={700} style={{ fontSize: 15, color: colors.rouge }}>
                {t('mesAnnonces.suspenduTitre')}
              </Texte>
              <Texte style={{ fontSize: 13, lineHeight: 19 }}>{t('mesAnnonces.suspenduTexte')}</Texte>
            </View>
          )}
          {VERSION_TEST && (
            <Pressable onPress={() => router.push('/retour')} accessibilityRole="button" style={styles.retourTest}>
              <Texte poids={700} style={{ fontSize: 14, color: colors.accentFonce }}>
                {t('retour.entree')}
              </Texte>
            </Pressable>
          )}
          <CartePartage />

          <Texte variante="titre" poids={700} style={styles.section} accessibilityRole="header">
            {t('compte.monCompte')}
          </Texte>
          <View style={styles.menu}>
            {estModerateur(profil) && <Ligne libelle={t('moderation.entreeEspace')} onPress={() => router.push('/moderation')} />}
            <Ligne
              libelle={enLigne ? t('mesAnnonces.entreeNb', { count: enLigne }) : t('mesAnnonces.entree')}
              onPress={() => router.push('/mes-annonces')}
            />
            <Ligne
              libelle={nouvellesAlertes ? t('alertes.entreeNb', { count: nouvellesAlertes }) : t('alertes.entree')}
              onPress={() => router.push('/alertes')}
            />
            <Ligne
              libelle={documents ? t('permis.documentsEntree', { count: documents }) : t('permis.documents')}
              onPress={() => router.push('/documents')}
            />
            <Ligne
              libelle={aNoter ? t('confiance.transactionsEntree', { count: aNoter }) : t('confiance.transactionsANoter')}
              onPress={() => router.push('/a-noter')}
            />
            {profil.est_pro && <Ligne libelle={t('banniere.entree')} onPress={() => router.push('/banniere')} />}
            <Ligne libelle={t('confiance.monProfil')} onPress={() => router.push({ pathname: '/membre/[id]', params: { id: profil.id } })} />
            <Ligne libelle={t('confiance.membresBloques')} onPress={() => router.push('/bloques')} />
            <Ligne libelle={t('compte.changerImage')} onPress={() => setFeuilleImages(true)} />
            <Ligne libelle={t('motDePasse.entree')} onPress={() => router.push('/mot-de-passe')} />
            <Ligne libelle={t('ecrans.compte.charte')} onPress={() => router.push('/charte')} />
            <Ligne libelle={t('confidentialite.entree')} onPress={() => router.push('/confidentialite')} />
            <Ligne libelle={t('ecrans.compte.revoir')} onPress={revoirAccueil} />
            <Ligne libelle={t('compte.langue')} onPress={changerLangue} dernier />
          </View>

          {!demandeDeconnexion ? (
            <Pressable
              onPress={() => setDemandeDeconnexion(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.deconnexion, pressed && { opacity: 0.7 }]}
            >
              <Texte poids={700} style={styles.deconnexionTexte}>
                {t('compte.deconnexion')}
              </Texte>
            </Pressable>
          ) : (
            <View style={styles.confirmation}>
              <Texte poids={700} style={{ fontSize: 15, textAlign: 'center' }}>
                {t('compte.deconnexionQuestion')}
              </Texte>
              <View style={styles.deux}>
                <Pressable
                  onPress={() => setDemandeDeconnexion(false)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.choix, styles.annuler, pressed && { opacity: 0.7 }]}
                >
                  <Texte poids={700} style={{ fontSize: 14, textAlign: 'center' }}>
                    {t('compte.annuler')}
                  </Texte>
                </Pressable>
                <Pressable
                  onPress={deconnecter}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.choix, { backgroundColor: colors.rouge }, pressed && { opacity: 0.8 }]}
                >
                  <Texte poids={700} style={{ fontSize: 14, color: colors.blanc, textAlign: 'center' }}>
                    {t('compte.deconnexionOui')}
                  </Texte>
                </Pressable>
              </View>
            </View>
          )}
          <Pressable onPress={() => router.push('/supprimer-compte')} accessibilityRole="button" style={styles.supprimer}>
            <Texte poids={600} style={{ fontSize: 13, color: colors.rouge, textDecorationLine: 'underline' }}>
              {t('supprimerCompte.entree')}
            </Texte>
          </Pressable>
        </View>
      </ScrollView>

      <FeuilleImagesProfil
        visible={feuilleImages}
        valeur={profil.avatar}
        onChoisir={changerAvatar}
        onFermer={() => setFeuilleImages(false)}
      />
    </View>
  );
}

function Ligne({ libelle, onPress, dernier }: { libelle: string; onPress: () => void; dernier?: boolean }) {
  const { rtl } = usePreferences();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligne, !dernier && styles.ligneBord, pressed && { opacity: 0.7 }]}
    >
      <Texte poids={600} style={styles.ligneTexte}>
        {libelle}
      </Texte>
      <View style={!rtl && { transform: [{ scaleX: -1 }] }}>
        <IconeRetour couleur={colors.brunMoyen} taille={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  retourTest: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  supprimer: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  suspendu: { gap: 4, padding: 14, borderRadius: 14, backgroundColor: colors.rougeFond, borderWidth: 1, borderColor: colors.rouge },
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: {
    backgroundColor: colors.brun,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  enteteTexte: { flex: 1, gap: 3 },
  nom: { fontSize: 20, color: colors.sable1 },
  lieu: { fontSize: 13, color: colors.sable3 },
  verifie: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Vert clair lisible sur le brun de l'en-tête (le vert #2F7A4B y serait trop sombre).
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.vertBord },
  verifieTexte: { fontSize: 13, color: colors.vertBord },
  contenu: { padding: 20, gap: 16 },
  section: { fontSize: 18 },
  menu: { backgroundColor: colors.carte, borderRadius: 16, paddingHorizontal: 16 },
  ligne: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ligneBord: { borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  ligneTexte: { flex: 1, fontSize: 15 },
  deconnexion: {
    minHeight: toucheMin + 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.rouge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deconnexionTexte: { fontSize: 15, color: colors.rouge, textAlign: 'center' },
  confirmation: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: colors.carte },
  deux: { flexDirection: 'row', gap: 10 },
  choix: { flex: 1, minHeight: toucheMin + 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  annuler: { borderWidth: 1.5, borderColor: colors.sable4 },
});
