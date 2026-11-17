import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Libelle } from '@/components/Champ';
import { IconeCoche } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { MOTIFS_ANNONCE, MOTIFS_MEMBRE, signaler, type Signalement } from '@/lib/confiance';
import { usePreferences } from '@/lib/preferences';
import { colors, fonts, toucheMin, sansContourWeb } from '@/theme';

import { Feuille } from './Feuille';

type Props = {
  visible: boolean;
  signalement: Signalement | null;
  /** Nom du membre signalé (titre « Signaler X »). */
  nom?: string;
  onFermer: () => void;
  /** Après l'envoi : proposer de bloquer le membre (absent si déjà bloqué ou sans objet). */
  onBloquer?: () => void;
  onEnvoye?: () => void;
};

/** Signaler une annonce ou un membre : motif, précisions facultatives, envoi anonyme, confirmation « sous 24 h ». */
export function FeuilleSignalement({ visible, signalement, nom, onFermer, onBloquer, onEnvoye }: Props) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const { profil } = useAuth();
  const [motif, setMotif] = useState<string | null>(null);
  const [precisions, setPrecisions] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'ok' | 'deja' | 'erreur'>('saisie');

  useEffect(() => {
    if (visible) {
      setMotif(null);
      setPrecisions('');
      setEtat('saisie');
    }
  }, [visible]);

  if (!signalement) return null;
  const membre = signalement.genre === 'membre';
  const motifs = membre ? MOTIFS_MEMBRE : MOTIFS_ANNONCE;
  const titre = membre ? t('confiance.titreSignalerMembre', { nom: nom ?? '' }) : t('confiance.signalerAnnonce');

  const envoyer = async () => {
    if (!profil || !motif) return;
    setEtat('envoi');
    const r = await signaler(profil.id, signalement, motif, precisions);
    setEtat(r);
    if (r !== 'erreur') onEnvoye?.();
  };

  if (etat === 'ok' || etat === 'deja') {
    return (
      <Feuille visible={visible} onFermer={onFermer} titre={titre}>
        <View style={styles.merci}>
          <View style={styles.coche}>
            <IconeCoche couleur={colors.blanc} taille={22} epaisseur={3} />
          </View>
          <Texte variante="titre" poids={700} style={{ fontSize: 20, textAlign: 'center' }} accessibilityRole="header">
            {t('confiance.merci')}
          </Texte>
          <Texte style={{ fontSize: 14, lineHeight: 21, textAlign: 'center' }}>
            {etat === 'deja' ? t('confiance.dejaSignale') : membre ? t('confiance.examenMembre') : t('confiance.examenAnnonce')}
          </Texte>
        </View>
        {onBloquer && (
          <>
            <Texte style={{ fontSize: 13, color: colors.brunMoyen, textAlign: 'center' }}>{t('confiance.proposerBlocage')}</Texte>
            <Bouton libelle={t('confiance.bloquerMembre')} onPress={onBloquer} variante="danger" />
          </>
        )}
        <Bouton libelle={t('confiance.fermer')} onPress={onFermer} variante="contour" />
      </Feuille>
    );
  }

  return (
    <Feuille visible={visible} onFermer={onFermer} titre={titre}>
      <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
        {titre}
      </Texte>
      <Libelle>{t('confiance.pourquoi')}</Libelle>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        {motifs.map((m) => {
          const choisi = motif === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMotif(m)}
              accessibilityRole="radio"
              accessibilityState={{ checked: choisi }}
              style={[styles.motif, choisi && styles.motifChoisi]}
            >
              <View style={[styles.radio, choisi && styles.radioChoisi]}>{choisi && <View style={styles.point} />}</View>
              <Texte poids={choisi ? 700 : 400} style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
                {membre ? t(`confiance.motifsMembre.${m as (typeof MOTIFS_MEMBRE)[number]}`) : t(`confiance.motifsAnnonce.${m as (typeof MOTIFS_ANNONCE)[number]}`)}
              </Texte>
            </Pressable>
          );
        })}
      </View>
      <Libelle>{t('confiance.precisions')}</Libelle>
      <TextInput
        value={precisions}
        onChangeText={setPrecisions}
        placeholder={t('confiance.precisionsAide')}
        placeholderTextColor={colors.brunMoyen}
        accessibilityLabel={t('confiance.precisions')}
        multiline
        maxLength={1000}
        style={[sansContourWeb, styles.champ, { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' }]}
      />
      <Texte style={{ fontSize: 12, lineHeight: 18, color: colors.brunMoyen }}>{t('confiance.anonyme')}</Texte>
      {etat === 'erreur' && (
        <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
          {t('confiance.erreur')}
        </Texte>
      )}
      <Bouton libelle={t('confiance.envoyerSignalement')} onPress={envoyer} actif={!!motif} occupe={etat === 'envoi'} />
      <Bouton libelle={t('confiance.annuler')} onPress={onFermer} variante="contour" />
    </Feuille>
  );
}

const styles = StyleSheet.create({
  motif: {
    minHeight: toucheMin + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  motifChoisi: { borderColor: colors.accent, backgroundColor: colors.carte },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sable4, alignItems: 'center', justifyContent: 'center' },
  radioChoisi: { borderColor: colors.accent },
  point: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  champ: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
    padding: 12,
    fontSize: 15,
    color: colors.brun,
    textAlignVertical: 'top',
  },
  merci: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  coche: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.vert, alignItems: 'center', justifyContent: 'center' },
});
