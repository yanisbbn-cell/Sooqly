import { StyleSheet, View } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';

import { BoutonOnglet, BoutonPublier, ConteneurBarre } from '@/components/BarreOnglets';
import { IconeAccueil, IconeCompte, IconeFavori, IconeMessage } from '@/components/Icones';
import { colors } from '@/theme';

/**
 * Les 5 onglets principaux : Annonces, Messages, Publier (au centre), Favoris, Compte.
 * La liste des onglets doit rester directement dans <Tabs> pour qu'Expo Router la reconnaisse.
 */
export default function OngletsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs style={styles.conteneur}>
      <View style={styles.ecran}>
        <TabSlot />
      </View>
      <TabList asChild>
        <ConteneurBarre>
          <TabTrigger name="index" href="/" asChild>
            <BoutonOnglet libelle={t('onglets.annonces')} Icone={IconeAccueil} />
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <BoutonOnglet libelle={t('onglets.messages')} Icone={IconeMessage} />
          </TabTrigger>
          <TabTrigger name="publier" href="/publier" asChild>
            <BoutonPublier libelle={t('onglets.publier')} aria={t('onglets.publierAria')} />
          </TabTrigger>
          <TabTrigger name="favoris" href="/favoris" asChild>
            <BoutonOnglet libelle={t('onglets.favoris')} Icone={IconeFavori} />
          </TabTrigger>
          <TabTrigger name="compte" href="/compte" asChild>
            <BoutonOnglet libelle={t('onglets.compte')} Icone={IconeCompte} />
          </TabTrigger>
        </ConteneurBarre>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: colors.blanc },
  ecran: { flex: 1 },
});
