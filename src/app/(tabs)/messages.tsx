import { useCallback, useEffect, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { ecouterMessages, mesDiscussions, type Discussion } from '@/lib/messagerie';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

/** Onglet Messages : une ligne par discussion (une discussion par annonce), les plus récentes d'abord. */
export default function Messages() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [liste, setListe] = useState<Discussion[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    if (!profil) return;
    setErreur(false);
    try {
      setListe(await mesDiscussions());
    } catch {
      setErreur(true);
    }
  }, [profil]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  // Un nouveau message (dans n'importe laquelle de mes discussions) met la liste à jour.
  useEffect(() => {
    if (!profil) return;
    const canal = ecouterMessages(`liste-${profil.id}`, null, () => charger());
    return () => {
      supabase.removeChannel(canal);
    };
  }, [profil, charger]);

  const entete = (
    <View style={[styles.entete, { paddingTop: insets.top + 20 }]}>
      <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
        {t('messagerie.titre')}
      </Texte>
      <Texte style={styles.sous}>{t('messagerie.sousTitre')}</Texte>
    </View>
  );

  if (!profil) {
    return (
      <View style={styles.ecran}>
        {entete}
        <View style={styles.contenu}>
          <EtatVide illustration="bulle" texte={t('messagerie.connexion')}>
            <Bouton libelle={t('publier.connexionBouton')} onPress={() => router.navigate('/compte')} />
          </EtatVide>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ecran}>
      {entete}
      <FlatList
        data={liste ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => {
              setRafraichit(true);
              await charger();
              setRafraichit(false);
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          liste ? <EtatVide illustration="bulle" texte={t('messagerie.aucune')} /> : <EtatChargement erreur={erreur} reessayer={charger} />
        }
        renderItem={({ item: d }) => {
          const dernier =
            d.dernier_type === 'vocal'
              ? t('messagerie.vocal')
              : d.dernier_type === 'lieu'
                ? t('messagerie.lieu')
                : d.dernier_type === 'permis'
                  ? t('messagerie.permis')
                  : (d.dernier_contenu ?? '');
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/discussion/[id]', params: { id: d.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${d.autre_nom}, ${d.annonce_titre}${d.non_lus ? `, ${t('messagerie.nonLus', { count: d.non_lus })}` : ''}`}
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.8 }]}
            >
              <ImageProfil numero={d.autre_avatar} taille={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texte poids={700} style={{ fontSize: 15 }} numberOfLines={1}>
                  {d.autre_nom}
                </Texte>
                <Texte poids={600} style={styles.annonce} numberOfLines={1}>
                  {d.annonce_titre}
                </Texte>
                <Texte poids={d.non_lus ? 700 : 400} style={styles.dernier} numberOfLines={1}>
                  {(d.dernier_auteur === profil.id ? t('messagerie.vous') : '') + dernier}
                </Texte>
              </View>
              {d.non_lus > 0 && (
                <View style={styles.pastille}>
                  <Texte poids={700} style={styles.pastilleTexte}>
                    {String(d.non_lus)}
                  </Texte>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: { backgroundColor: colors.brun, paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  titre: { fontSize: 22, color: colors.sable1 },
  sous: { fontSize: 13, color: colors.sable3 },
  contenu: { padding: 20, gap: 10 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.carte },
  annonce: { fontSize: 12, color: colors.brunMoyen },
  dernier: { fontSize: 13 },
  pastille: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: colors.accentFonce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleTexte: { fontSize: 12, color: colors.blanc, textAlign: 'center' },
});
