import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BanniereVitrine } from '@/components/BanniereVitrine';
import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import {
  choisirBanniereAnnonce,
  maBanniere,
  photosDeMesAnnonces,
  proposerBanniere,
  retirerBanniere,
  urlBanniere,
} from '@/lib/banniere';
import { DetecteurProvider, useDetecteur } from '@/lib/detecteur';
import { appareilDisponible, preparer, prendrePhoto, urlPhoto, type Source } from '@/lib/photos';
import { colors } from '@/theme';

type Etat = { banniere: string | null; proposee: string | null; est_pro: boolean };

/** Professionnels : choisir la bannière de sa Page Pro (photo d'annonce, ou photo du téléphone vérifiée). */
export default function EcranBanniere() {
  return (
    <DetecteurProvider>
      <ChoixBanniere />
    </DetecteurProvider>
  );
}

function ChoixBanniere() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profil } = useAuth();
  const detecteur = useDetecteur();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [erreur, setErreur] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    if (!profil) return;
    setErreur(false);
    try {
      const [e, p] = await Promise.all([maBanniere(), photosDeMesAnnonces(profil.id)]);
      setEtat(e);
      setPhotos(p);
    } catch {
      setErreur(true);
    }
  }, [profil]);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const agir = async (action: () => Promise<boolean>, succes: string) => {
    setOccupe(true);
    setMessage(null);
    const ok = await action();
    setOccupe(false);
    setMessage({ ok, texte: ok ? succes : t('banniere.erreur') });
    if (ok) charger();
  };

  const depuisTelephone = async (source: Source) => {
    if (!profil) return;
    setMessage(null);
    const uri = await prendrePhoto(source);
    if (!uri) return;
    setOccupe(true);
    setMessage({ ok: true, texte: t('banniere.analyse') });
    try {
      const p = await preparer(uri);
      // Même règle que les photos d'annonces : aucune personne ni aucun animal.
      const analyse = await detecteur.analyser(p.petite);
      if (analyse.interdit) {
        setOccupe(false);
        return setMessage({ ok: false, texte: t('banniere.refusee') });
      }
      const ok = await proposerBanniere(profil.id, p.base64);
      setOccupe(false);
      setMessage({ ok, texte: ok ? t('banniere.envoyee') : t('banniere.erreur') });
      if (ok) charger();
    } catch {
      setOccupe(false);
      setMessage({ ok: false, texte: t('banniere.erreur') });
    }
  };

  if (!profil || !etat) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('banniere.titre')} />
        <EtatChargement erreur={erreur} reessayer={charger} />
      </View>
    );
  }

  const taille = Math.floor((Math.min(width, 900) - 40 - 16) / 3);

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('banniere.titre')} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 32 }]}>
        {!etat.est_pro ? (
          <Texte style={styles.aide}>{t('banniere.reserveePro')}</Texte>
        ) : (
          <>
            <Texte style={styles.aide}>{t('banniere.intro')}</Texte>

            <Texte poids={700} style={styles.sous}>
              {t('banniere.actuelle')}
            </Texte>
            <View style={styles.apercu} pointerEvents="none">
              <BanniereVitrine image={urlBanniere(etat.banniere)} apercu />
            </View>
            {!etat.banniere && <Texte style={styles.aide}>{t('banniere.dessinee')}</Texte>}
            {etat.proposee && (
              <View style={styles.attente}>
                <Texte style={{ fontSize: 13, lineHeight: 19 }}>{t('banniere.enAttente')}</Texte>
              </View>
            )}

            {message && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {occupe && <ActivityIndicator color={colors.accent} />}
                <Texte poids={600} style={{ flex: 1, fontSize: 13, color: message.ok ? colors.vert : colors.rouge }} accessibilityLiveRegion="polite">
                  {message.texte}
                </Texte>
              </View>
            )}

            <Texte poids={700} style={styles.sous}>
              {t('banniere.depuisTelephone')}
            </Texte>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {appareilDisponible() && (
                <View style={{ flex: 1 }}>
                  <Bouton libelle={t('banniere.appareil')} onPress={() => depuisTelephone('camera')} occupe={occupe} variante="sombre" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Bouton libelle={t('banniere.galerie')} onPress={() => depuisTelephone('galerie')} occupe={occupe} variante="sombre" />
              </View>
            </View>

            <Texte poids={700} style={styles.sous}>
              {t('banniere.depuisAnnonces')}
            </Texte>
            {photos.length === 0 ? (
              <Texte style={styles.aide}>{t('banniere.aucunePhoto')}</Texte>
            ) : (
              <View style={styles.grille}>
                {photos.map((f) => {
                  const choisie = etat.banniere === `photos-annonces/${f}`;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => agir(() => choisirBanniereAnnonce(f), t('banniere.choisie'))}
                      disabled={occupe}
                      accessibilityRole="button"
                      accessibilityState={{ selected: choisie }}
                      style={[styles.vignette, { width: taille, height: taille * 0.75 }, choisie && styles.choisie]}
                    >
                      <Image source={{ uri: urlPhoto(f) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </Pressable>
                  );
                })}
              </View>
            )}

            {(etat.banniere || etat.proposee) && (
              <Bouton libelle={t('banniere.revenir')} onPress={() => agir(retirerBanniere, t('banniere.choisie'))} variante="contour" />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 12 },
  aide: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
  sous: { fontSize: 15, marginTop: 6 },
  apercu: { borderRadius: 14, overflow: 'hidden' },
  attente: { padding: 12, borderRadius: 12, backgroundColor: colors.carte, borderWidth: 1, borderColor: colors.sable3 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vignette: { borderRadius: 10, overflow: 'hidden', backgroundColor: colors.sable2 },
  choisie: { borderWidth: 3, borderColor: colors.accent },
});
