import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTranslation } from 'react-i18next';

import { IconeLecture, IconePause } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { lienVocal } from '@/lib/messagerie';
import { colors } from '@/theme';

import { FormeOnde } from './FormeOnde';

const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Lecteur d'un message vocal, façon Telegram : bouton rond, forme d'onde qui se remplit pendant l'écoute,
 * durée. Toucher la forme d'onde avance ou recule dans le message.
 */
export function LecteurVocal({ chemin, duree, onde, clair }: { chemin: string; duree: number; onde: number[] | null; clair: boolean }) {
  const { t } = useTranslation();
  const [lien, setLien] = useState<string | null>(null);
  const lecteur = useAudioPlayer(lien ? { uri: lien } : null, { updateInterval: 100 });
  const etat = useAudioPlayerStatus(lecteur);

  useEffect(() => {
    lienVocal(chemin).then(setLien);
  }, [chemin]);

  const total = etat.duration && etat.duration > 0 ? etat.duration : duree;
  const position = etat.currentTime || 0;
  const fini = etat.didJustFinish || (total > 0 && position >= total - 0.15);
  const progression = etat.playing || (position > 0 && !fini) ? Math.min(1, position / Math.max(0.1, total)) : 0;

  const basculer = () => {
    if (!lien) return;
    if (etat.playing) lecteur.pause();
    else {
      if (fini) lecteur.seekTo(0);
      lecteur.play();
    }
  };

  // Couleurs : sur ma bulle brune, rond clair et ondes claires ; sur la bulle de l'autre, rond terre cuite.
  const fondRond = clair ? colors.sable1 : colors.accent;
  const iconeRond = clair ? colors.brun : colors.blanc;

  return (
    <View style={styles.ligne}>
      <Pressable
        onPress={basculer}
        disabled={!lien}
        accessibilityRole="button"
        accessibilityLabel={t(etat.playing ? 'messagerie.pause' : 'messagerie.ecouter')}
        style={[styles.rond, { backgroundColor: fondRond }]}
      >
        {!lien ? (
          <ActivityIndicator color={iconeRond} size="small" />
        ) : (
          <View style={{ direction: 'ltr', marginStart: etat.playing ? 0 : 2 }}>
            {etat.playing ? <IconePause couleur={iconeRond} taille={18} /> : <IconeLecture couleur={iconeRond} taille={18} />}
          </View>
        )}
      </Pressable>
      <View style={styles.droite}>
        <FormeOnde
          barres={onde ?? []}
          progression={progression}
          couleurLue={clair ? colors.sable1 : colors.accent}
          couleurRestante={clair ? colors.sable4 : colors.sable3}
          etiquette={t('messagerie.vocal')}
          onChercher={(f) => {
            if (!lien || !total) return;
            lecteur.seekTo(f * total);
            if (!etat.playing) lecteur.play();
          }}
        />
        <Texte style={{ fontSize: 11, color: clair ? colors.sable3 : colors.brunMoyen, writingDirection: 'ltr', textAlign: 'left' }}>
          {etat.playing || progression > 0 ? `${minutes(position)} / ${minutes(total)}` : minutes(total)}
        </Texte>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 230 },
  rond: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  droite: { flex: 1, gap: 4 },
});
