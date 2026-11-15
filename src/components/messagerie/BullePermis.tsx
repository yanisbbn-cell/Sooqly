import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Texte } from '@/components/Texte';
import { statutDocument, type StatutDocument } from '@/lib/permis';
import { colors } from '@/theme';

/** Icône « carte de permis » reprise de la maquette. */
export function IconePermis({ couleur }: { couleur: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={9} cy={11} r={2} />
      <Path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3" />
    </Svg>
  );
}

/** Bulle « Permis de conduire » : jamais la photo, seulement son statut (en attente, accepté, refusé, effacé). */
export function BullePermis({
  documentId,
  clair,
  jeSuisDestinataire,
  reponse,
}: {
  documentId: string | null;
  clair: boolean;
  jeSuisDestinataire: boolean;
  /** Bulle écrite par le loueur quand il accepte ou refuse : son titre est la réponse elle-même. */
  reponse?: boolean;
}) {
  const { t } = useTranslation();
  const [statut, setStatut] = useState<StatutDocument | null | undefined>(undefined);
  useEffect(() => {
    if (documentId) statutDocument(documentId).then(setStatut);
  }, [documentId]);

  const couleur = clair ? colors.sable1 : colors.brun;
  const couleurStatut =
    statut === 'accepte' ? (clair ? colors.vertBord : colors.vert) : statut === 'refuse' ? (clair ? colors.rougeFond : colors.rouge) : clair ? colors.sable3 : colors.brunMoyen;
  return (
    <View style={{ gap: 6, minWidth: 210 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconePermis couleur={couleur} />
        <Texte poids={700} style={{ fontSize: 14, color: couleur }}>
          {reponse ? (statut === undefined ? t('permis.titre') : t(`permis.statut.${statut ?? 'efface'}`)) : t('permis.bulleEnvoye')}
        </Texte>
      </View>
      {statut !== undefined && !reponse && (
        <Texte poids={600} style={{ fontSize: 13, color: couleurStatut }}>
          {t(`permis.statut.${statut ?? 'efface'}`)}
        </Texte>
      )}
      {jeSuisDestinataire && statut && !reponse && (
        <Pressable onPress={() => router.push('/documents')} accessibilityRole="link" style={{ minHeight: 36, justifyContent: 'center' }}>
          <Texte poids={700} style={{ fontSize: 13, color: couleur, textDecorationLine: 'underline' }}>
            {t('permis.voirDocuments')}
          </Texte>
        </Pressable>
      )}
    </View>
  );
}
