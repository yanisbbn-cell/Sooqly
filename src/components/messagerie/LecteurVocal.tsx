import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTranslation } from 'react-i18next';

import { IconeLecture, IconePause } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { lienVocal } from '@/lib/messagerie';
import { colors, toucheMin } from '@/theme';

const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Lecteur d'un message vocal (lien temporaire, seulement pour les membres de la discussion). */
export function LecteurVocal({ chemin, duree, clair }: { chemin: string; duree: number; clair: boolean }) {
  const { t } = useTranslation();
  const [lien, setLien] = useState<string | null>(null);
  const lecteur = useAudioPlayer(lien ? { uri: lien } : null);
  const etat = useAudioPlayerStatus(lecteur);

  useEffect(() => {
    lienVocal(chemin).then(setLien);
  }, [chemin]);

  const couleur = clair ? colors.sable1 : colors.brun;
  const enLecture = etat.playing;
  const position = etat.currentTime || 0;

  const basculer = () => {
    if (!lien) return;
    if (enLecture) lecteur.pause();
    else {
      if (etat.didJustFinish || (etat.duration && position >= etat.duration - 0.1)) lecteur.seekTo(0);
      lecteur.play();
    }
  };

  return (
    <View style={styles.ligne}>
      <Pressable
        onPress={basculer}
        disabled={!lien}
        accessibilityRole="button"
        accessibilityLabel={t(enLecture ? 'messagerie.pause' : 'messagerie.ecouter')}
        style={[styles.bouton, { borderColor: couleur }]}
      >
        {!lien ? (
          <ActivityIndicator color={couleur} size="small" />
        ) : (
          // Le triangle « lecture » garde son sens dans les deux langues.
          <View style={{ direction: 'ltr' }}>{enLecture ? <IconePause couleur={couleur} /> : <IconeLecture couleur={couleur} />}</View>
        )}
      </Pressable>
      <View style={[styles.barre, { backgroundColor: clair ? colors.brunMoyen : colors.sable2 }]}>
        <View
          style={[
            styles.plein,
            { backgroundColor: clair ? colors.sable1 : colors.brun, width: `${Math.min(100, (position / Math.max(1, etat.duration || duree)) * 100)}%` },
          ]}
        />
      </View>
      <Texte style={{ color: couleur, fontSize: 12, writingDirection: 'ltr' }}>{minutes(enLecture ? position : duree)}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 190 },
  bouton: { width: toucheMin - 4, height: toucheMin - 4, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  barre: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  plein: { height: 4 },
});
