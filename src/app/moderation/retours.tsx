import { useCallback, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { estAdmin, useAuth } from '@/lib/auth';
import { changerStatutRetour, lienCapture, listerRetours, type Retour } from '@/lib/retours';
import { colors, toucheMin } from '@/theme';

/** Administrateur : retours envoyés par les testeurs (« Signaler un problème »). */
export default function Retours() {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [liste, setListe] = useState<Retour[] | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setListe(await listerRetours());
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (estAdmin(profil)) charger();
    }, [charger, profil]),
  );

  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const date = (d: string) => {
    const x = new Date(d);
    return `${x.getDate()} ${mois[x.getMonth()]} · ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
  };

  const statut = async (r: Retour, s: Retour['statut']) => {
    if (await changerStatutRetour(r.id, s)) setListe((l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, statut: s } : x)));
  };

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('retour.admin')} />
      <FlatList
        data={estAdmin(profil) ? (liste ?? []) : []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.contenu}
        ListEmptyComponent={liste ? <Texte style={styles.note}>{t('retour.aucun')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />}
        renderItem={({ item: r }) => (
          <View style={[styles.carte, r.statut === 'nouveau' && { borderColor: colors.accent, borderWidth: 1.5 }]}>
            <Texte style={styles.note}>
              {[date(r.cree_le), r.membre?.nom_affiche ?? t('retour.anonyme'), t(`retour.statut.${r.statut}`)].join(' · ')}
            </Texte>
            <Texte style={{ fontSize: 14, lineHeight: 21 }}>{r.message}</Texte>
            {r.ecran ? <Texte poids={600} style={styles.note}>{r.ecran}</Texte> : null}
            <Texte style={styles.note}>
              {[r.appareil.marque, r.appareil.modele, `${r.appareil.systeme ?? ''} ${r.appareil.version_systeme ?? ''}`.trim()]
                .filter(Boolean)
                .join(' · ')}
            </Texte>
            <View style={styles.actions}>
              {r.capture && (
                <Pressable
                  onPress={async () => {
                    const lien = await lienCapture(r.capture!);
                    if (lien) Linking.openURL(lien);
                  }}
                  accessibilityRole="button"
                  style={styles.action}
                >
                  <Texte poids={700} style={{ fontSize: 13 }}>
                    {t('retour.voirCapture')}
                  </Texte>
                </Pressable>
              )}
              {r.statut === 'nouveau' && (
                <Pressable onPress={() => statut(r, 'lu')} accessibilityRole="button" style={styles.action}>
                  <Texte poids={700} style={{ fontSize: 13 }}>
                    {t('retour.marquerLu')}
                  </Texte>
                </Pressable>
              )}
              {r.statut !== 'corrige' && (
                <Pressable onPress={() => statut(r, 'corrige')} accessibilityRole="button" style={styles.action}>
                  <Texte poids={700} style={{ fontSize: 13, color: colors.vert }}>
                    {t('retour.marquerCorrige')}
                  </Texte>
                </Pressable>
              )}
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
  note: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  carte: { padding: 14, borderRadius: 14, backgroundColor: colors.carte, gap: 6, borderWidth: 1, borderColor: colors.sable2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: toucheMin, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.sable4, justifyContent: 'center' },
});
