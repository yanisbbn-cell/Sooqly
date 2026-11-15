import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Texte } from '@/components/Texte';
import type { Message } from '@/lib/messagerie';

import { CarteLieu } from './CarteLieu';
import { LecteurVocal } from './LecteurVocal';
import { colors } from '@/theme';

/** Une bulle de la discussion : à droite (côté fin) pour mes messages, à gauche pour ceux de l'autre membre. */
export function BulleMessage({ message: m, moi }: { message: Message; moi: boolean }) {
  const { t } = useTranslation();
  const d = new Date(m.cree_le);
  const heure = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const couleur = moi ? colors.sable1 : colors.brun;
  return (
    <View style={[styles.bulle, moi ? styles.moi : styles.autre]}>
      {m.type === 'texte' ? (
        <Texte style={{ fontSize: 15, lineHeight: 21, color: couleur }}>{m.contenu}</Texte>
      ) : m.type === 'vocal' && m.fichier ? (
        <LecteurVocal chemin={m.fichier} duree={m.duree_secondes ?? 0} clair={moi} />
      ) : m.type === 'lieu' && m.lieu_nom ? (
        <CarteLieu nom={m.lieu_nom} lat={m.lieu_lat} lng={m.lieu_lng} clair={moi} />
      ) : (
        <Texte poids={600} style={{ fontSize: 14, color: couleur }}>
          {m.type === 'vocal' ? `🎤 ${t('messagerie.vocal')}` : m.type === 'lieu' ? `📍 ${m.lieu_nom ?? t('messagerie.lieu')}` : t('messagerie.permis')}
        </Texte>
      )}
      <Texte style={[styles.heure, { color: moi ? colors.sable3 : colors.brunMoyen }]}>{heure}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  bulle: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 2 },
  moi: { alignSelf: 'flex-end', backgroundColor: colors.brun, borderBottomEndRadius: 4 },
  autre: { alignSelf: 'flex-start', backgroundColor: colors.carte, borderBottomStartRadius: 4 },
  heure: { fontSize: 10, alignSelf: 'flex-end', writingDirection: 'ltr' },
});
