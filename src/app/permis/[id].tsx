import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Calendrier } from '@/components/Calendrier';
import { Libelle } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { lireAnnonce, type Annonce } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { depuisTexte } from '@/lib/location';
import { envoyerPermis } from '@/lib/permis';
import { prendrePhoto, type Source } from '@/lib/photos';
import { colors } from '@/theme';

/** Envoyer son permis au loueur (location d'un véhicule qui l'exige). */
export default function EnvoyerPermis() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [annonce, setAnnonce] = useState<Annonce | null | undefined>(undefined);
  const [uri, setUri] = useState<string | null>(null);
  const [dernierJour, setDernierJour] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    lireAnnonce(String(id)).then(setAnnonce).catch(() => setAnnonce(null));
  }, [id]);

  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const lendemain = (d: string) => {
    const x = depuisTexte(d);
    x.setDate(x.getDate() + 1);
    return `${x.getDate()} ${mois[x.getMonth()]} ${x.getFullYear()}`;
  };

  const choisir = async (source: Source) => {
    const u = await prendrePhoto(source);
    if (u) setUri(u);
  };

  const envoyer = async () => {
    if (!annonce || !profil || !uri || !dernierJour || occupe) return;
    setOccupe(true);
    setErreur(false);
    const conv = await envoyerPermis({ annonceId: annonce.id, locataireId: profil.id, loueurId: annonce.auteur_id, uri, dernierJour }).catch(() => null);
    setOccupe(false);
    if (!conv) return setErreur(true);
    // L'appli ne garde pas la photo : le locataire ne la revoit plus.
    setUri(null);
    router.replace({ pathname: '/discussion/[id]', params: { id: conv } });
  };

  const bloque = !uri ? t('permis.bloquePhoto') : !dernierJour ? t('permis.bloqueDate') : '';

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('permis.ecranTitre')} />
      {!annonce ? (
        <EtatChargement erreur={annonce === null} reessayer={() => router.back()} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.contenu}>
            <View style={styles.encart}>
              <Texte poids={700} style={{ fontSize: 15 }}>
                {annonce.titre}
              </Texte>
              <Texte style={{ fontSize: 13, lineHeight: 20 }}>{t('permis.explication')}</Texte>
            </View>

            <View style={styles.bloc}>
              <Libelle>{t('permis.photo')}</Libelle>
              {uri && <Image source={{ uri }} style={styles.apercu} resizeMode="contain" accessibilityLabel={t('permis.photo')} />}
              {Platform.OS !== 'web' && (
                <Bouton libelle={uri ? t('permis.changer') : t('permis.prendre')} onPress={() => choisir('camera')} variante="sombre" />
              )}
              <Bouton libelle={t('permis.galerie')} onPress={() => choisir('galerie')} variante="contour" />
            </View>

            <View style={styles.bloc}>
              <Libelle>{t('permis.finLocation')}</Libelle>
              <Calendrier debut={dernierJour} fin={null} plage={false} onChange={(d) => setDernierJour(d)} />
              <Texte poids={600} style={{ fontSize: 13 }}>
                {dernierJour ? t('permis.effaceLe', { date: lendemain(dernierJour) }) : t('permis.finAide')}
              </Texte>
            </View>

            {erreur && (
              <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }}>
                {t('permis.erreur')}
              </Texte>
            )}
          </ScrollView>
          <View style={[styles.bas, { paddingBottom: insets.bottom + 12 }]}>
            {bloque ? (
              <Texte poids={600} style={{ fontSize: 13, textAlign: 'center', color: colors.brunMoyen }}>
                {bloque}
              </Texte>
            ) : null}
            <Bouton libelle={t('permis.envoyerBouton')} onPress={envoyer} actif={!bloque} occupe={occupe} grand />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 18, paddingBottom: 32 },
  encart: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.vertFond, borderWidth: 1, borderColor: colors.vertBord },
  bloc: { gap: 10 },
  apercu: { width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.sable1 },
  bas: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.sable2, backgroundColor: colors.blanc },
});
