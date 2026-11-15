import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useTranslation } from 'react-i18next';

import { IconeMicro } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { niveau, reduire } from '@/lib/onde';
import { colors, toucheMin } from '@/theme';

import { FormeOnde } from './FormeOnde';

const DUREE_MAX_MS = 2 * 60 * 1000;
const DUREE_MIN_MS = 700;
const SEUIL_ANNULER = 110;
const minutes = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}`;

type Props = {
  rtl: boolean;
  desactive?: boolean;
  /** Ce qui s'affiche à gauche du micro quand on n'enregistre pas (repère de lieu, champ de saisie). */
  gauche: ReactNode;
  onEnvoyer: (uri: string, secondes: number, onde: number[]) => void;
};

/**
 * Micro façon Telegram : MAINTENIR pour enregistrer (ondes en direct), RELÂCHER pour envoyer,
 * GLISSER vers le début de la ligne pour annuler. Un appui trop court rappelle le geste.
 */
export function MicroMaintenu({ rtl, desactive, gauche, onEnvoyer }: Props) {
  const { t } = useTranslation();
  const enregistreur = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [enCours, setEnCours] = useState(false);
  const [duree, setDuree] = useState(0);
  const [direct, setDirect] = useState<number[]>([]);
  const [aide, setAide] = useState<string | null>(null);
  const glisse = useRef(new Animated.Value(0)).current;

  const releves = useRef<number[]>([]);
  const debut = useRef(0);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);
  const actif = useRef(false);
  const annule = useRef(false);
  const permission = useRef<boolean | null>(null);
  // Le doigt peut se lever avant que le micro soit prêt : on s'en souvient.
  const doigtLeve = useRef(false);

  const arreterMinuteur = () => {
    if (minuteur.current) clearInterval(minuteur.current);
    minuteur.current = null;
  };

  const commencer = async () => {
    if (desactive) return;
    annule.current = false;
    doigtLeve.current = false;
    glisse.setValue(0);
    if (permission.current !== true) {
      const p = await requestRecordingPermissionsAsync();
      permission.current = p.granted;
      if (!p.granted) {
        setAide(t('messagerie.micRefuse'));
        return;
      }
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
    } catch {
      setAide(t('messagerie.micRefuse'));
      return;
    }
    actif.current = true;
    releves.current = [];
    debut.current = Date.now();
    setDuree(0);
    setDirect([]);
    setAide(null);
    setEnCours(true);
    minuteur.current = setInterval(() => {
      const ecoule = Date.now() - debut.current;
      const n = niveau(enregistreur.getStatus().metering);
      releves.current.push(n);
      setDuree(ecoule);
      setDirect((d) => [...d.slice(-23), Math.round(n * 100)]);
      if (ecoule >= DUREE_MAX_MS) terminer(true);
    }, 100);
    if (doigtLeve.current) terminer(true);
  };

  const terminer = async (envoyer: boolean) => {
    if (!actif.current) return;
    actif.current = false;
    arreterMinuteur();
    const ecoule = Date.now() - debut.current;
    setEnCours(false);
    glisse.setValue(0);
    try {
      await enregistreur.stop();
    } catch {
      // déjà arrêté
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (!envoyer) return;
    if (ecoule < DUREE_MIN_MS) {
      setAide(t('messagerie.maintenir'));
      return;
    }
    if (enregistreur.uri) onEnvoyer(enregistreur.uri, ecoule / 1000, reduire(releves.current));
  };

  useEffect(() => () => arreterMinuteur(), []);
  useEffect(() => {
    if (!aide) return;
    const m = setTimeout(() => setAide(null), 3000);
    return () => clearTimeout(m);
  }, [aide]);

  // Glisser vers le début de la ligne (à gauche en français, à droite en arabe) annule.
  const sens = rtl ? 1 : -1;
  const geste = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          commencer();
        },
        onPanResponderMove: (_, g) => {
          if (!actif.current) return;
          const d = Math.max(0, g.dx * sens);
          glisse.setValue(-Math.min(d, SEUIL_ANNULER + 20) * (rtl ? -1 : 1));
          if (d > SEUIL_ANNULER && actif.current && !annule.current) {
            annule.current = true;
            terminer(false);
          }
        },
        onPanResponderRelease: () => {
          doigtLeve.current = true;
          if (!annule.current) terminer(true);
        },
        onPanResponderTerminate: () => {
          doigtLeve.current = true;
          terminer(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rtl, desactive],
  );

  return (
    <View style={styles.rangee}>
      <View style={{ flex: 1 }}>
        {enCours ? (
          <View style={styles.enregistrement}>
            <View style={styles.point} />
            <Texte poids={700} style={styles.chrono}>
              {minutes(duree)}
            </Texte>
            <View style={{ flex: 1, height: 28, overflow: 'hidden' }}>
              <FormeOnde barres={direct} progression={1} couleurLue={colors.accent} couleurRestante={colors.accent} />
            </View>
            <Animated.View style={{ flexShrink: 0, transform: [{ translateX: glisse }] }}>
              <Texte poids={600} style={styles.annuler} numberOfLines={1}>
                {rtl ? `${t('messagerie.glisserAnnuler')} ›` : `‹ ${t('messagerie.glisserAnnuler')}`}
              </Texte>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.gauche}>{gauche}</View>
        )}
        {aide && !enCours && (
          <View style={styles.bulleAide} accessibilityLiveRegion="polite">
            <Texte poids={600} style={{ fontSize: 12, color: colors.sable1, textAlign: 'center' }}>
              {aide}
            </Texte>
          </View>
        )}
      </View>
      <View
        {...geste.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('messagerie.enregistrer')}
        accessibilityHint={t('messagerie.maintenir')}
        style={[styles.micro, enCours && styles.microActif, desactive && { opacity: 0.5 }]}
      >
        <IconeMicro couleur={colors.blanc} taille={enCours ? 26 : 20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flex: 1 },
  gauche: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  enregistrement: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: toucheMin, paddingHorizontal: 4 },
  point: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rouge },
  chrono: { fontSize: 14, writingDirection: 'ltr', minWidth: 38 },
  annuler: { fontSize: 12, color: colors.brunMoyen, flexShrink: 0 },
  micro: {
    width: toucheMin,
    height: toucheMin,
    borderRadius: toucheMin / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microActif: { transform: [{ scale: 1.35 }], backgroundColor: colors.accentFonce },
  bulleAide: {
    position: 'absolute',
    bottom: toucheMin + 6,
    end: 0,
    start: 0,
    backgroundColor: colors.brun,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
