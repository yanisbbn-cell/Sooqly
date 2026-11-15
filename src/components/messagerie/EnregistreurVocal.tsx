import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Texte } from '@/components/Texte';
import { colors } from '@/theme';

const minutes = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}`;
const DUREE_MAX_MS = 2 * 60 * 1000;

/** Enregistrement d'un message vocal (2 minutes au plus) : démarre tout de suite, Annuler ou Envoyer. */
export function EnregistreurVocal({ onEnvoyer, onAnnuler }: { onEnvoyer: (uri: string, secondes: number) => void; onAnnuler: () => void }) {
  const { t } = useTranslation();
  const enregistreur = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const etat = useAudioRecorderState(enregistreur, 250);
  const [refuse, setRefuse] = useState(false);
  const fini = useRef(false);

  useEffect(() => {
    (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return setRefuse(true);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
    })().catch(() => setRefuse(true));
    return () => {
      if (!fini.current) enregistreur.stop().catch(() => {});
    };
  }, [enregistreur]);

  const terminer = async (envoyer: boolean) => {
    if (fini.current) return;
    fini.current = true;
    const duree = etat.durationMillis;
    try {
      await enregistreur.stop();
    } catch {
      // déjà arrêté
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (envoyer && enregistreur.uri) onEnvoyer(enregistreur.uri, duree / 1000);
    else onAnnuler();
  };

  useEffect(() => {
    if (etat.durationMillis >= DUREE_MAX_MS) terminer(true);
  });

  if (refuse) {
    return (
      <View style={styles.cadre}>
        <Texte style={{ fontSize: 13, color: colors.rouge, flex: 1 }}>{t('messagerie.micRefuse')}</Texte>
        <Bouton libelle={t('messagerie.annulerVocal')} onPress={onAnnuler} variante="contour" />
      </View>
    );
  }

  return (
    <View style={styles.cadre}>
      <View style={styles.point} />
      <Texte poids={700} style={{ flex: 1, fontSize: 13 }} numberOfLines={2} accessibilityLiveRegion="polite">
        {t('messagerie.enregistrement', { duree: minutes(etat.durationMillis) })}
      </Texte>
      <Bouton libelle={t('messagerie.annulerVocal')} onPress={() => terminer(false)} variante="contour" />
      <Bouton libelle={t('messagerie.envoyer')} onPress={() => terminer(true)} actif={etat.durationMillis > 500} />
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, flex: 1 },
  point: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.rouge },
});
