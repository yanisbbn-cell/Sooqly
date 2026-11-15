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
        {/* Par défaut, l'écran ne rétrécit pas : sur le web, son bas passerait sous la barre d'onglets. */}
        <TabSlot style={styles.slot} />
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
  // « minHeight: 0 » : sur le web, l'écran ne dépasse pas sous la barre d'onglets.
  ecran: { flex: 1, minHeight: 0 },
  slot: { flexShrink: 1, minHeight: 0 },
});
