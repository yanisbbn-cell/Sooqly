import { useCallback, useState } from 'react';
import { EtatVide } from '@/components/EtatVide';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { debloquer, mesBlocages, type MembreBloque } from '@/lib/confiance';
import { colors, toucheMin } from '@/theme';

/** « Membres bloqués » : la liste, et un bouton Débloquer pour chacun. */
export default function Bloques() {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [liste, setListe] = useState<MembreBloque[] | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setListe(await mesBlocages());
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const mois = t('mois', { returnObjects: true }) as unknown as string[];

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('confiance.membresBloques')} />
      <FlatList
        data={liste ?? []}
        keyExtractor={(x) => x.bloque_id}
        contentContainerStyle={styles.contenu}
        ListEmptyComponent={liste ? <EtatVide illustration="cadenas" texte={t('confiance.aucunBloque')} /> : <EtatChargement erreur={erreur} reessayer={charger} />}
        renderItem={({ item: x }) => {
          const d = new Date(x.cree_le);
          return (
            <View style={styles.carte}>
              <ImageProfil numero={x.avatar} taille={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texte poids={700} style={{ fontSize: 15 }}>
                  {x.nom_affiche}
                </Texte>
                <Texte style={{ fontSize: 12, color: colors.brunMoyen }}>
                  {t('confiance.bloqueLe', { date: `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}` })}
                </Texte>
              </View>
              <Pressable
                onPress={async () => {
                  if (profil && (await debloquer(profil.id, x.bloque_id))) charger();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t('confiance.debloquer')} ${x.nom_affiche}`}
                style={styles.bouton}
              >
                <Texte poids={700} style={{ fontSize: 14 }}>
                  {t('confiance.debloquer')}
                </Texte>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 10 },
  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.carte },
  bouton: { minHeight: toucheMin, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.sable4, justifyContent: 'center' },
});
