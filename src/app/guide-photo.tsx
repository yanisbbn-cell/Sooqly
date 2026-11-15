import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { IconeCategorie } from '@/components/IconeCategorie';
import { Texte } from '@/components/Texte';
import { colors } from '@/theme';

/** Guide photo : un exemple accepté, un exemple refusé, et les règles pour bien photographier. */
export default function GuidePhoto() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const regles = t('photos.regles', { returnObjects: true }) as unknown as [string, string][];
  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('photos.guideTitre')} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.exemples}>
          <View style={[styles.exemple, { borderColor: colors.vert }]}>
            <View style={[styles.image, { backgroundColor: colors.sable1 }]}>
              <IconeCategorie icone="sofa" couleur={colors.brun} taille={48} />
            </View>
            <Texte poids={700} style={[styles.legende, { color: colors.vert }]}>
              ✓ {t('photos.accepte')}
            </Texte>
          </View>
          <View style={[styles.exemple, { borderColor: colors.rouge }]}>
            <View style={[styles.image, { backgroundColor: colors.sable2 }]}>
              <IconeCategorie icone="sofa" couleur={colors.brun} taille={48} />
              {/* Silhouette schématique d'une personne, barrée : ce qui est refusé. */}
              <View style={styles.silhouette}>
                <View style={styles.tete} />
                <View style={styles.corps} />
              </View>
              <View style={styles.barre} />
            </View>
            <Texte poids={700} style={[styles.legende, { color: colors.rouge }]}>
              ✕ {t('photos.refuse')}
            </Texte>
          </View>
        </View>

        {regles.map(([titre, texte], i) => (
          <View key={titre} style={styles.regle}>
            <View style={styles.numero}>
              <Texte variante="titre" poids={700} style={{ color: colors.sable1, fontSize: 14 }}>
                {String(i + 1)}
              </Texte>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texte poids={700} style={{ fontSize: 15 }}>
                {titre}
              </Texte>
              <Texte style={{ fontSize: 13, lineHeight: 20, color: colors.brunMoyen }}>{texte}</Texte>
            </View>
          </View>
        ))}

        <Bouton libelle={t('photos.compris')} onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 14 },
  exemples: { flexDirection: 'row', gap: 12 },
  exemple: { flex: 1, borderWidth: 2, borderRadius: 14, overflow: 'hidden' },
  image: { height: 110, alignItems: 'center', justifyContent: 'center' },
  legende: { fontSize: 12, padding: 8, textAlign: 'center' },
  silhouette: { position: 'absolute', end: 18, bottom: 10, alignItems: 'center' },
  tete: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.sable4 },
  corps: { width: 30, height: 34, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: colors.sable4, marginTop: 2 },
  barre: { position: 'absolute', width: 120, height: 4, backgroundColor: colors.rouge, transform: [{ rotate: '-30deg' }] },
  regle: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.carte },
  numero: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.brun, alignItems: 'center', justifyContent: 'center' },
});
