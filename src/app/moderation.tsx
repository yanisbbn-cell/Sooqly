import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { listerAValider, type AnnonceResume } from '@/lib/annonces';
import { estModerateur, useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre } from '@/lib/prix';
import { useCategories } from '@/lib/referentiel';
import { colors } from '@/theme';

/** Liste provisoire des annonces en attente de validation (le vrai espace de modération arrive à l'étape 12). */
export default function Moderation() {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const { profil } = useAuth();
  const { donnees: categories } = useCategories();
  const [liste, setListe] = useState<AnnonceResume[] | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setListe(await listerAValider());
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  if (!estModerateur(profil)) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('moderation.titre')} />
      </View>
    );
  }

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('moderation.titre')} />
      <FlatList
        data={liste ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={<Texte style={styles.note}>{t('moderation.provisoire')}</Texte>}
        ListEmptyComponent={
          liste ? <Texte style={styles.note}>{t('moderation.aucune')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />
        }
        renderItem={({ item }) => {
          const c = categories?.find((x) => x.cle === item.categorie);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.8 }]}
            >
              <Texte poids={700} style={{ fontSize: 15 }}>
                {item.titre}
              </Texte>
              <Texte style={styles.note}>
                {[c ? (langue === 'ar' ? c.nom_ar : c.nom_fr) : '', item.type === 'don' ? t('carte.gratuit') : `${formaterNombre(item.prix_da)} ${t('da')}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Texte>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 10 },
  note: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen, marginBottom: 6 },
  ligne: { padding: 14, borderRadius: 14, backgroundColor: colors.carte, gap: 4 },
});
