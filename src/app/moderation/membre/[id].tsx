import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { Feuille } from '@/components/confiance/Feuille';
import { changerRole } from '@/lib/admin';
import { estAdmin, estModerateur, useAuth } from '@/lib/auth';
import { changerSexeMembre, historiqueMembre, modererMembre, sexeMembre, type ActionMembre, type Historique } from '@/lib/moderation';
import { colors } from '@/theme';

/** Modération : historique d'un membre (signalements, refus, décisions) et suspension / exclusion. */
export default function HistoriqueMembre() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [h, setH] = useState<Historique | null>(null);
  const [erreur, setErreur] = useState(false);
  const [demande, setDemande] = useState<ActionMembre | null>(null);
  const [motif, setMotif] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreurAction, setErreurAction] = useState(false);
  const [sexe, setSexe] = useState<'h' | 'f' | null>(null);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [hist, sx] = await Promise.all([historiqueMembre(String(id)), sexeMembre(String(id))]);
      setH(hist);
      setSexe(sx);
    } catch {
      setErreur(true);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      if (estModerateur(profil)) charger();
    }, [charger, profil]),
  );

  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const date = (d: string) => {
    const x = new Date(d);
    return `${x.getDate()} ${mois[x.getMonth()]} ${x.getFullYear()}`;
  };

  if (!estModerateur(profil) || !h?.membre) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('moderation.historique')} />
        {estModerateur(profil) && <EtatChargement erreur={erreur} reessayer={charger} />}
      </View>
    );
  }
  const m = h.membre;

  const agir = async (action: ActionMembre) => {
    setOccupe(true);
    setErreurAction(false);
    const ok = await modererMembre(m.id, action, motif);
    setOccupe(false);
    if (!ok) return setErreurAction(true);
    setDemande(null);
    setMotif('');
    charger();
  };

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('moderation.historique')} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => router.push({ pathname: '/membre/[id]', params: { id: m.id } })}
          accessibilityRole="button"
          style={styles.identite}
        >
          <ImageProfil numero={m.avatar} taille={56} />
          <View style={{ flex: 1, gap: 3 }}>
            <Texte variante="titre" poids={700} style={{ fontSize: 19 }}>
              {m.nom_affiche}
            </Texte>
            <Texte style={styles.note}>{t('moderation.stats', { annonces: h.annonces, date: date(m.cree_le) })}</Texte>
            <View style={[styles.etat, { backgroundColor: m.exclu || m.suspendu ? colors.rougeFond : colors.vertFond }]}>
              <Texte poids={700} style={{ fontSize: 12, color: m.exclu || m.suspendu ? colors.rouge : colors.vert }}>
                {m.exclu ? t('moderation.exclu') : m.suspendu ? t('moderation.suspendu') : t('moderation.actif')}
              </Texte>
            </View>
          </View>
        </Pressable>

        {erreurAction && (
          <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
            {t('moderation.erreur')}
          </Texte>
        )}
        {m.role === 'membre' && m.id !== profil?.id && (
          <View style={{ gap: 8 }}>
            {m.suspendu ? (
              <Bouton libelle={t('moderation.reactiver')} onPress={() => agir('reactiver')} occupe={occupe} variante="sombre" />
            ) : (
              <Bouton libelle={t('moderation.suspendre')} onPress={() => setDemande('suspendre')} variante="danger" />
            )}
            {!m.exclu && <Bouton libelle={t('moderation.exclure')} onPress={() => setDemande('exclure')} variante="contour" />}
          </View>
        )}

        {/* Homme ou femme (privé) : correction en cas d'erreur signalée par le membre (règle des cours particuliers). */}
        <View style={styles.sexe}>
          <Texte style={[styles.note, { flex: 1 }]}>
            {t('sexe.moderation', { valeur: sexe ? t(sexe === 'h' ? 'sexe.homme' : 'sexe.femme') : t('sexe.nonIndique') })}
          </Texte>
          {sexe && (
            <Bouton
              libelle={t(sexe === 'h' ? 'sexe.corrigerFemme' : 'sexe.corrigerHomme')}
              onPress={async () => {
                setErreurAction(false);
                if (await changerSexeMembre(m.id, sexe === 'h' ? 'f' : 'h')) charger();
                else setErreurAction(true);
              }}
              variante="contour"
            />
          )}
        </View>

        {estAdmin(profil) && m.id !== profil?.id && m.role !== 'admin' && !m.suspendu && (
          <Bouton
            libelle={m.role === 'moderateur' ? t('reglages.retirerRole') : t('reglages.nommer')}
            onPress={async () => {
              setErreurAction(false);
              if (await changerRole(m.id, m.role === 'moderateur' ? 'membre' : 'moderateur')) charger();
              else setErreurAction(true);
            }}
            variante="contour"
          />
        )}

        <Bloc titre={t('moderation.signalementsTitre')} vide={!h.signalements.length}>
          {h.signalements.map((s) => (
            <View key={s.id} style={styles.ligne}>
              <Texte poids={700} style={{ fontSize: 14 }}>
                {t(s.annonce_titre ? `confiance.motifsAnnonce.${s.motif}` : `confiance.motifsMembre.${s.motif}`, { defaultValue: s.motif })}
              </Texte>
              <Texte style={styles.note}>
                {[date(s.cree_le), s.annonce_titre, t(`moderation.traitements.${s.traitement}`, { defaultValue: s.traitement })]
                  .filter(Boolean)
                  .join(' · ')}
              </Texte>
              {s.precisions ? <Texte style={{ fontSize: 13 }}>{s.precisions}</Texte> : null}
            </View>
          ))}
        </Bloc>

        <Bloc titre={t('moderation.refuseesTitre')} vide={!h.refusees.length}>
          {h.refusees.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: r.id } })}
              accessibilityRole="button"
              style={styles.ligne}
            >
              <Texte poids={700} style={{ fontSize: 14 }}>
                {r.titre}
              </Texte>
              <Texte style={styles.note}>
                {[r.correction ? t('mesAnnonces.statut.correction') : t('mesAnnonces.statut.refuse'), r.motif].filter(Boolean).join(' · ')}
              </Texte>
            </Pressable>
          ))}
        </Bloc>

        <Bloc titre={t('moderation.actionsTitre')} vide={!h.actions.length}>
          {h.actions.map((a, i) => (
            <View key={i} style={styles.ligne}>
              <Texte poids={700} style={{ fontSize: 14 }}>
                {t(`moderation.actions.${a.action}`, { defaultValue: a.action })}
              </Texte>
              <Texte style={styles.note}>{[date(a.cree_le), a.motif].filter(Boolean).join(' · ')}</Texte>
            </View>
          ))}
        </Bloc>
      </ScrollView>

      <Feuille visible={!!demande} onFermer={() => setDemande(null)}>
        <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
          {t(demande === 'exclure' ? 'moderation.exclureQ' : 'moderation.suspendreQ', { nom: m.nom_affiche })}
        </Texte>
        <Texte style={{ fontSize: 14, lineHeight: 21 }}>
          {t(demande === 'exclure' ? 'moderation.exclureTexte' : 'moderation.suspendreTexte')}
        </Texte>
        <Champ libelle={t('moderation.motifMembre')} value={motif} onChangeText={setMotif} maxLength={300} />
        <Bouton
          libelle={t(demande === 'exclure' ? 'moderation.exclure' : 'moderation.suspendre')}
          onPress={() => demande && agir(demande)}
          occupe={occupe}
          variante="danger"
        />
        <Bouton libelle={t('moderation.annuler')} onPress={() => setDemande(null)} variante="contour" />
      </Feuille>
    </View>
  );
}

function Bloc({ titre, vide, children }: { titre: string; vide: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 8 }}>
      <Texte variante="titre" poids={700} style={{ fontSize: 16 }} accessibilityRole="header">
        {titre}
      </Texte>
      {vide ? <Texte style={styles.note}>{t('moderation.rien')}</Texte> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  sexe: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 18 },
  identite: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  note: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  etat: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ligne: { padding: 12, borderRadius: 12, backgroundColor: colors.carte, gap: 3 },
});
