import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { listerAValider, type AnnonceResume } from '@/lib/annonces';
import { estModerateur, useAuth } from '@/lib/auth';
import { compteurs, signalementsATraiter, traiterSignalement, type Signalement } from '@/lib/moderation';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre } from '@/lib/prix';
import { useCategories } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

type Onglet = 'annonces' | 'signalements';

/** Espace de modération : file des annonces à valider et file des signalements. */
export default function Moderation() {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const { profil } = useAuth();
  const { donnees: categories } = useCategories();
  const [onglet, setOnglet] = useState<Onglet>('annonces');
  const [annonces, setAnnonces] = useState<AnnonceResume[] | null>(null);
  const [signalements, setSignalements] = useState<Signalement[] | null>(null);
  const [nombres, setNombres] = useState({ annonces: 0, signalements: 0 });
  const [erreur, setErreur] = useState(false);
  const [erreurAction, setErreurAction] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [a, s, n] = await Promise.all([listerAValider(), signalementsATraiter(), compteurs()]);
      setAnnonces(a);
      setSignalements(s);
      setNombres(n);
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (estModerateur(profil)) charger();
    }, [charger, profil]),
  );

  if (!estModerateur(profil)) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('moderation.espace')} />
      </View>
    );
  }

  const traiter = async (s: Signalement, traitement: 'traite' | 'rejete') => {
    setErreurAction(false);
    if (await traiterSignalement(s.id, profil!.id, traitement)) {
      setSignalements((l) => (l ?? []).filter((x) => x.id !== s.id));
      setNombres((n) => ({ ...n, signalements: Math.max(0, n.signalements - 1) }));
    } else setErreurAction(true);
  };

  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const date = (d: string) => {
    const x = new Date(d);
    return `${x.getDate()} ${mois[x.getMonth()]} ${x.getFullYear()}`;
  };
  const motif = (s: Signalement) =>
    t(s.annonce_id ? `confiance.motifsAnnonce.${s.motif}` : `confiance.motifsMembre.${s.motif}`, { defaultValue: s.motif });

  const entete = (
    <View style={{ gap: 12 }}>
      <View style={styles.onglets} accessibilityRole="tablist">
        {(['annonces', 'signalements'] as const).map((o) => (
          <Pressable
            key={o}
            onPress={() => setOnglet(o)}
            accessibilityRole="tab"
            accessibilityState={{ selected: onglet === o }}
            style={[styles.onglet, onglet === o && styles.ongletActif]}
          >
            <Texte poids={700} style={{ fontSize: 14, color: onglet === o ? colors.sable1 : colors.brun }}>
              {t(o === 'annonces' ? 'moderation.ongletAnnonces' : 'moderation.ongletSignalements', { count: nombres[o] })}
            </Texte>
          </Pressable>
        ))}
      </View>
      <Texte style={styles.note}>{t('moderation.rappel')}</Texte>
      {erreurAction && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
          {t('moderation.erreur')}
        </Texte>
      )}
    </View>
  );

  if (onglet === 'annonces') {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('moderation.espace')} />
        <FlatList
          data={annonces ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.contenu}
          ListHeaderComponent={entete}
          ListEmptyComponent={
            annonces ? <Texte style={styles.note}>{t('moderation.aucune')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />
          }
          renderItem={({ item }) => {
            const c = categories?.find((x) => x.cle === item.categorie);
            const enAttente = (item.photos ?? []).filter((p) => p.decision_moderation === 'en_attente');
            const alerte = enAttente.some((p) => p.resultat_detecteur?.detail?.interdit);
            const objets = [
              ...new Set(enAttente.flatMap((p) => (p.resultat_detecteur?.detail?.interdit ? (p.resultat_detecteur.detail.objets ?? []) : []).map((o) => o.classe))),
            ].join(', ');
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.carte, alerte && { borderColor: colors.rouge, borderWidth: 1.5 }, pressed && { opacity: 0.8 }]}
              >
                <Texte poids={700} style={{ fontSize: 15 }}>
                  {item.titre}
                </Texte>
                <Texte style={styles.note}>
                  {[
                    c ? (langue === 'ar' ? c.nom_ar : c.nom_fr) : '',
                    item.type === 'don' ? t('carte.gratuit') : `${formaterNombre(item.prix_da)} ${t('da')}`,
                    t('photos.recapPhotos', { count: (item.photos ?? []).length }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Texte>
                {alerte && (
                  <Texte poids={700} style={{ fontSize: 12, color: colors.rouge }}>
                    {t('moderation.detecteurAlerte', { objets })}
                  </Texte>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('moderation.espace')} />
      <FlatList
        data={signalements ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={entete}
        ListEmptyComponent={
          signalements ? <Texte style={styles.note}>{t('moderation.aucunSignalement')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />
        }
        renderItem={({ item: s }) => (
          <View style={styles.carte}>
            <Texte poids={700} style={{ fontSize: 15 }}>
              {motif(s)}
            </Texte>
            <Texte style={styles.note}>{t('moderation.signaleLe', { date: date(s.cree_le) })}</Texte>
            {s.precisions ? <Texte style={{ fontSize: 13, lineHeight: 19 }}>{t('moderation.precisions', { texte: s.precisions })}</Texte> : null}
            {s.annonce_id && (
              <Pressable
                onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: s.annonce_id! } })}
                accessibilityRole="link"
                style={styles.lien}
              >
                <Texte poids={700} style={styles.lienTexte}>
                  {t('moderation.annonceVisee', { titre: s.annonce_titre ?? '' })}
                </Texte>
              </Pressable>
            )}
            {s.membre_id && (
              <Pressable
                onPress={() => router.push({ pathname: '/moderation/membre/[id]', params: { id: s.membre_id! } })}
                accessibilityRole="link"
                style={styles.lien}
              >
                <Texte poids={700} style={styles.lienTexte}>
                  {t('moderation.vise', { nom: s.membre_nom ?? '' })}
                  {s.membre_suspendu ? ` · ${t('moderation.suspendu')}` : ''}
                </Texte>
              </Pressable>
            )}
            {s.nb_signalements > 1 && (
              <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }}>
                {t('moderation.nbSignalements', { count: s.nb_signalements })}
              </Texte>
            )}
            <View style={styles.actions}>
              <Pressable onPress={() => traiter(s, 'traite')} accessibilityRole="button" style={[styles.action, styles.actionPleine]}>
                <Texte poids={700} style={{ fontSize: 13, color: colors.sable1 }}>
                  {t('moderation.traite')}
                </Texte>
              </Pressable>
              <Pressable onPress={() => traiter(s, 'rejete')} accessibilityRole="button" style={styles.action}>
                <Texte poids={700} style={{ fontSize: 13 }}>
                  {t('moderation.rejete')}
                </Texte>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 10 },
  note: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
  onglets: { flexDirection: 'row', gap: 8 },
  onglet: {
    flex: 1,
    minHeight: toucheMin,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ongletActif: { backgroundColor: colors.brun, borderColor: colors.brun },
  carte: { padding: 14, borderRadius: 14, backgroundColor: colors.carte, gap: 6 },
  lien: { minHeight: 32, justifyContent: 'center' },
  lienTexte: { fontSize: 13, color: colors.accentFonce, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  action: {
    flex: 1,
    minHeight: toucheMin,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPleine: { backgroundColor: colors.brun, borderColor: colors.brun },
});
