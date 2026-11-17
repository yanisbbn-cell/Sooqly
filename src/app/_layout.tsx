import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';

import '@/i18n';
import { AccueilPremierLancement } from '@/components/AccueilPremierLancement';
import { BarreLogo } from '@/components/BarreLogo';
import { InsetsEcran } from '@/lib/insets';
import { DemandeSexe } from '@/components/compte/DemandeSexe';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { NotificationsProvider } from '@/lib/notifications';
import { RechercheProvider } from '@/lib/recherche';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function Contenu({ policesPretes }: { policesPretes: boolean }) {
  const { pret, rtl, accueilVisible, fermerAccueil } = usePreferences();
  const toutEstPret = pret && policesPretes;
  const insets = useSafeAreaInsets();
  // Le logo Sooqly reste en haut de chaque écran (l'accueil a déjà le sien, en grand).
  const barre = usePathname() !== '/';

  useEffect(() => {
    if (toutEstPret) SplashScreen.hideAsync();
  }, [toutEstPret]);

  if (!toutEstPret) return null;

  return (
    // « direction » retourne toute la mise en page en arabe (droite à gauche).
    <View style={[styles.racine, { direction: rtl ? 'rtl' : 'ltr' }]}>
      <StatusBar style="light" />
      {barre && <BarreLogo />}
      {/* Sous la barre, les écrans n'ont plus à laisser la place de la barre d'état (marge haute 0). */}
      <InsetsEcran.Provider value={insets}>
        <SafeAreaInsetsContext.Provider value={barre ? { ...insets, top: 0 } : insets}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.blanc } }} />
        </SafeAreaInsetsContext.Provider>
      </InsetsEcran.Provider>
      {!accueilVisible && <DemandeSexe />}
      {accueilVisible && (
        <AccueilPremierLancement
          onFermer={fermerAccueil}
          onCreerCompte={() => {
            fermerAccueil();
            router.navigate('/compte');
          }}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [policesChargees, erreurPolices] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
  });

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        {/* En cas d'échec du chargement des polices, l'appli s'ouvre quand même avec les polices du téléphone. */}
        <AuthProvider>
          <NotificationsProvider>
            <RechercheProvider>
              <Contenu policesPretes={policesChargees || !!erreurPolices} />
            </RechercheProvider>
          </NotificationsProvider>
        </AuthProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  racine: { flex: 1, backgroundColor: colors.blanc },
});
