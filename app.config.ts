import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuration dynamique : reprend app.json et ajoute le fichier Firebase (notifications Android).
 * Sur EAS, le fichier est fourni par la variable d'environnement de type « fichier » GOOGLE_SERVICES_JSON
 * (rangée sur expo.dev, pas dans Git).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
