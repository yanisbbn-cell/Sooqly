import { useCallback, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCloche } from '@/components/Icones';
import { Logo } from '@/components/Logo';
import { Texte } from '@/components/Texte';
import {
  changerNotifications,
  decrireAlerte,
  mesAlertes,
  remettreAZero,
  supprimerAlerte,
  type Alerte,
} from '@/lib/alertes';
import { usePreferences } from '@/lib/preferences';
import { useRecherche } from '@/lib/recherche';
import { useCategories, useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

/** « Mes alertes de recherche » : résumé, nouvelles annonces, notifications, Voir les annonces, Supprimer. */
export default function Alertes() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue } = usePreferences();
  const { setFiltres, setTri } = useRecherche();
  const categories = useCategories();
  const { donnees: wilayas } = useWilayas();
  const [liste, setListe] = useState<Alerte[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [erreurAction, setErreurAction] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setListe(await mesAlertes());
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const maj = (id: string, f: (a: Alerte) => Alerte | null) =>
    setListe((l) => (l ?? []).map((a) => (a.id === id ? f(a) : a)).filter((a): a is Alerte => !!a));

  const voir = (a: Alerte) => {
    remettreAZero(a.id);
    setFiltres(a.filtres);
    setTri('recent');
    router.navigate('/');
  };

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('alertes.titre')} />
      <FlatList
        data={liste ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Texte style={{ fontSize: 13, lineHeight: 20, color: colors.brunMoyen }}>{t('alertes.intro')}</Texte>
            <View style={{ gap: 6 }}>
              <Texte poids={700} style={styles.surtitre}>
                {t('alertes.apercu')}
              </Texte>
              <View style={styles.apercu} accessibilityRole="image" accessibilityLabel={`${t('alertes.apercuTitre')} : ${t('alertes.apercuTexte')}`}>
                <View style={styles.apercuIcone}>
                  <Texte variante="titre" poids={700} style={{ fontSize: 13, color: colors.sable1 }}>
                    Sly
                  </Texte>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Logo taille={13} couleur={colors.brun} />
                    <Texte style={{ fontSize: 11, color: colors.brunMoyen }}>{t('alertes.maintenant')}</Texte>
                  </View>
                  <Texte poids={700} style={{ fontSize: 13 }}>
                    {t('alertes.apercuTitre')}
                  </Texte>
                  <Texte style={{ fontSize: 13 }}>{t('alertes.apercuTexte')}</Texte>
                </View>
              </View>
            </View>
            {erreurAction && (
              <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
                {t('alertes.erreur')}
              </Texte>
            )}
          </View>
        }
        ListEmptyComponent={
          liste ? (
            <EtatVide illustration="cloche" texte={t('alertes.aucune')}>
              <Bouton libelle={t('alertes.lancer')} onPress={() => router.navigate('/')} variante="sombre" />
            </EtatVide>
          ) : (
            <EtatChargement erreur={erreur} reessayer={charger} />
          )
        }
        renderItem={({ item: a }) => {
          const d = decrireAlerte(a.filtres, t, langue, categories.donnees ?? null, wilayas ?? null);
          return (
            <View style={styles.carte}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Texte poids={700} style={{ fontSize: 15 }}>
                    {d.titre}
                  </Texte>
                  <Texte style={{ fontSize: 12, lineHeight: 18, color: colors.brunMoyen }}>{d.detail}</Texte>
                </View>
                {a.nouvelles_annonces > 0 && a.notifications && (
                  <View style={styles.nouvelles}>
                    <Texte poids={700} style={{ fontSize: 11, color: colors.blanc }}>
                      {t('alertes.nouvelles', { count: a.nouvelles_annonces })}
                    </Texte>
                  </View>
                )}
              </View>
              <Pressable
                onPress={async () => {
                  setErreurAction(false);
                  if (await changerNotifications(a.id, !a.notifications)) maj(a.id, (x) => ({ ...x, notifications: !x.notifications }));
                  else setErreurAction(true);
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: a.notifications }}
                style={[styles.notif, a.notifications && styles.notifOn]}
              >
                <IconeCloche couleur={a.notifications ? colors.vert : colors.brunMoyen} taille={18} plein={a.notifications} />
                <Texte poids={700} style={{ fontSize: 13, color: a.notifications ? colors.vert : colors.brunMoyen }}>
                  {a.notifications ? t('alertes.notifOn') : t('alertes.notifOff')}
                </Texte>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Bouton libelle={t('alertes.voir')} onPress={() => voir(a)} variante="sombre" />
                </View>
                <Pressable
                  onPress={async () => {
                    setErreurAction(false);
                    if (await supprimerAlerte(a.id)) maj(a.id, () => null);
                    else setErreurAction(true);
                  }}
                  accessibilityRole="button"
                  style={styles.supprimer}
                >
                  <Texte poids={700} style={{ fontSize: 14, color: colors.rouge }}>
                    {t('alertes.supprimer')}
                  </Texte>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 12 },
  surtitre: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.brunMoyen },
  apercu: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.carte,
    borderWidth: 1,
    borderColor: colors.sable2,
  },
  apercuIcone: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.brun, alignItems: 'center', justifyContent: 'center' },
  carte: { padding: 14, borderRadius: 16, backgroundColor: colors.carte, gap: 10 },
  nouvelles: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.accent },
  notif: {
    minHeight: toucheMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    backgroundColor: colors.blanc,
  },
  notifOn: { borderColor: colors.vertBord, backgroundColor: colors.vertFond },
  supprimer: {
    minHeight: toucheMin + 4,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.rouge,
    justifyContent: 'center',
  },
});
