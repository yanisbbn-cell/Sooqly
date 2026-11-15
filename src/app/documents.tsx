import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCadenas } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { documentsRecus, lienDocument, repondreDocument, type DocumentRecu } from '@/lib/permis';
import { colors } from '@/theme';

/** « Documents reçus » : permis envoyés par les locataires, visibles par le seul destinataire. */
export default function Documents() {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [liste, setListe] = useState<DocumentRecu[] | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    if (!profil) return;
    setErreur(false);
    try {
      setListe(await documentsRecus(profil.id));
    } catch {
      setErreur(true);
    }
  }, [profil]);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('permis.documents')} />
      <FlatList
        data={liste ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.contenu}
        ListHeaderComponent={
          <View style={styles.note}>
            <IconeCadenas couleur={colors.brun} />
            <Texte style={{ fontSize: 12, lineHeight: 18, flex: 1 }}>{t('permis.documentsNote')}</Texte>
          </View>
        }
        ListEmptyComponent={liste ? <Texte style={styles.vide}>{t('permis.aucun')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />}
        renderItem={({ item }) => <CarteDocument document={item} onRepondu={charger} />}
      />
    </View>
  );
}

function CarteDocument({ document: d, onRepondu }: { document: DocumentRecu; onRepondu: () => void }) {
  const { t } = useTranslation();
  const [lien, setLien] = useState<string | null | undefined>(undefined);
  const [occupe, setOccupe] = useState<'accepte' | 'refuse' | null>(null);
  const mois = t('mois', { returnObjects: true }) as unknown as string[];
  const efface = new Date(d.efface_le);
  const nom = d.expediteur?.nom_affiche ?? '';

  useFocusEffect(
    useCallback(() => {
      lienDocument(d.fichier).then(setLien);
    }, [d.fichier]),
  );

  const repondre = async (s: 'accepte' | 'refuse') => {
    setOccupe(s);
    await repondreDocument(d.id, s);
    setOccupe(null);
    onRepondu();
  };

  return (
    <View style={styles.carte}>
      <Texte variante="titre" poids={700} style={{ fontSize: 16 }}>
        {t('permis.titre')}
      </Texte>
      <Texte style={styles.petit}>{t('permis.envoyePar', { nom, annonce: d.annonce?.titre ?? '' })}</Texte>
      <View style={styles.photo}>
        {lien ? (
          <Image source={{ uri: lien }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={t('permis.titre')} />
        ) : lien === undefined ? (
          <ActivityIndicator color={colors.brunMoyen} accessibilityLabel={t('permis.chargementPhoto')} />
        ) : null}
      </View>
      <Texte style={styles.petit}>{t('permis.effaceLe', { date: `${efface.getDate()} ${mois[efface.getMonth()]} ${efface.getFullYear()}` })}</Texte>
      {d.statut === 'en_attente' ? (
        <View style={styles.rangee}>
          <View style={{ flex: 1 }}>
            <Bouton libelle={t('permis.refuser')} onPress={() => repondre('refuse')} variante="contour" occupe={occupe === 'refuse'} />
          </View>
          <View style={{ flex: 1 }}>
            <Bouton libelle={t('permis.accepter')} onPress={() => repondre('accepte')} occupe={occupe === 'accepte'} />
          </View>
        </View>
      ) : (
        <Texte poids={700} style={{ fontSize: 14, color: d.statut === 'accepte' ? colors.vert : colors.rouge }}>
          {t(d.statut === 'accepte' ? 'permis.accepteTexte' : 'permis.refuseTexte', { nom })}
        </Texte>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 14 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.sable2, marginBottom: 4 },
  vide: { fontSize: 14, padding: 20, borderRadius: 14, backgroundColor: colors.carte },
  carte: { padding: 16, borderRadius: 16, backgroundColor: colors.carte, gap: 10 },
  petit: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
  photo: { height: 210, borderRadius: 12, backgroundColor: colors.sable1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rangee: { flexDirection: 'row', gap: 10 },
});
