import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { AssistantPublication, type AnnonceExistante } from '@/components/publier/AssistantPublication';
import { lireAnnonce } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { DetecteurProvider } from '@/lib/detecteur';
import { lireTarifsEtDisponibilites } from '@/lib/location';
import { colors } from '@/theme';

/** « Modifier » une de mes annonces : l'assistant de publication, pré-rempli. */
export default function Modifier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [existante, setExistante] = useState<AnnonceExistante | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const annonce = await lireAnnonce(String(id));
      if (!annonce || annonce.auteur_id !== profil?.id) throw new Error('introuvable');
      const { tarifs, periodes } =
        annonce.type === 'location' ? await lireTarifsEtDisponibilites(annonce.id) : { tarifs: [], periodes: [] };
      setExistante({ annonce, tarifs, periodes });
    } catch {
      setErreur(true);
    }
  }, [id, profil?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (!profil || !existante) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.blanc }}>
        <EnTeteRetour titre={t('mesAnnonces.modifierTitre')} />
        <EtatChargement erreur={erreur} reessayer={charger} />
      </View>
    );
  }
  return (
    <DetecteurProvider>
      <AssistantPublication profil={profil} existante={existante} />
    </DetecteurProvider>
  );
}
