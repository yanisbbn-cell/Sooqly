import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { IconeRetour } from '@/components/Icones';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { useAuth, type Profil } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

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
          <View style={styles.carte}>
            <Texte style={styles.suite}>{t('compte.suite')}</Texte>
          </View>

          <Texte variante="titre" poids={700} style={styles.section} accessibilityRole="header">
            {t('compte.monCompte')}
          </Texte>
          <View style={styles.menu}>
            <Ligne libelle={t('compte.changerImage')} onPress={() => setFeuilleImages(true)} />
            <Ligne libelle={t('ecrans.compte.charte')} onPress={() => router.push('/charte')} />
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
  carte: { backgroundColor: colors.carte, borderRadius: 16, padding: 16 },
  suite: { fontSize: 14, lineHeight: 21, color: colors.brunMoyen },
  section: { fontSize: 17 },
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
