import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Libelle, styleChamp } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Pastille } from '@/components/Pastille';
import { IconeCadenas } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { lireAnnonce, type Annonce } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { ARNAQUE, contacter } from '@/lib/messagerie';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre } from '@/lib/prix';
import { colors, fonts, sansContourWeb } from '@/theme';

/** « Contacter le vendeur » : rappel de l'annonce, messages rapides, message pré-rempli, coordonnées privées. */
export default function Contacter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { rtl } = usePreferences();
  const { profil } = useAuth();
  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined);
  const [texte, setTexte] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    lireAnnonce(String(id))
      .then((a) => {
        setAnnonce(a);
        if (a) setTexte(t('messagerie.brouillon', { titre: a.titre }));
      })
      .catch(() => setAnnonce(null));
  }, [id, t]);

  const envoyer = async () => {
    if (!annonce || !profil || !texte.trim() || occupe) return;
    setOccupe(true);
    setErreur(false);
    const conv = await contacter(annonce.id, profil.id, annonce.auteur_id, texte);
    setOccupe(false);
    if (!conv) setErreur(true);
    else router.replace({ pathname: '/discussion/[id]', params: { id: conv } });
  };

  const location = annonce?.type === 'location';
  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t(location ? 'messagerie.contacterLoueur' : 'messagerie.contacterVendeur')} />
      {!annonce ? (
        <EtatChargement erreur={annonce === null} reessayer={() => router.back()} />
      ) : (
        <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.rappel}>
            <Texte poids={700} style={{ fontSize: 15 }} numberOfLines={2}>
              {annonce.titre}
            </Texte>
            <Texte poids={700} style={{ fontSize: 14 }}>
              {annonce.type === 'don' ? t('carte.gratuit') : `${formaterNombre(annonce.prix_da)} ${t('da')}`}
            </Texte>
            {annonce.auteur && (
              <Texte style={styles.petit}>
                {[annonce.auteur.est_pro && annonce.auteur.nom_commercial ? annonce.auteur.nom_commercial : annonce.auteur.nom_affiche, annonce.ville]
                  .filter(Boolean)
                  .join(' · ')}
              </Texte>
            )}
          </View>

          <View style={styles.bloc}>
            <Libelle>{t('messagerie.messagesRapides')}</Libelle>
            <View style={styles.grille}>
              {(t('messagerie.rapides', { returnObjects: true }) as unknown as string[]).map((m) => (
                <Pastille key={m} libelle={m} choisi={false} onPress={() => setTexte(t('messagerie.salam') + m.charAt(0).toLowerCase() + m.slice(1))} />
              ))}
            </View>
          </View>

          <View style={styles.bloc}>
            <Libelle>{t('messagerie.votreMessage')}</Libelle>
            <TextInput
              value={texte}
              onChangeText={setTexte}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              accessibilityLabel={t('messagerie.votreMessage')}
              style={[sansContourWeb, styles.zone, { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' }]}
            />
          </View>

          {ARNAQUE.test(texte) && (
            <View style={styles.alerte} accessibilityRole="alert">
              <Texte poids={600} style={{ fontSize: 13, lineHeight: 19, color: colors.rouge }}>
                {t('messagerie.arnaque')}
              </Texte>
            </View>
          )}

          <View style={styles.prive}>
            <IconeCadenas couleur={colors.vert} />
            <Texte style={{ fontSize: 13, lineHeight: 19, flex: 1 }}>{t('messagerie.prive')}</Texte>
          </View>

          {erreur && (
            <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }}>
              {t('messagerie.erreurEnvoi')}
            </Texte>
          )}
          <Bouton libelle={t('messagerie.envoyer')} onPress={envoyer} actif={!!texte.trim()} occupe={occupe} grand />
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Texte poids={600} style={{ fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' }}>
              {t('messagerie.voirAnnonce')}
            </Texte>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 16 },
  rappel: { padding: 14, borderRadius: 14, backgroundColor: colors.carte, gap: 4 },
  petit: { fontSize: 12, color: colors.brunMoyen },
  bloc: { gap: 8 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zone: { ...styleChamp, height: 130, paddingTop: 12, fontSize: 15, color: colors.brun },
  alerte: { backgroundColor: colors.rougeFond, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.rouge },
  prive: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.vertFond, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.vertBord },
});
