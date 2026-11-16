import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { usePreferences } from '@/lib/preferences';
import { CLE_CAPTCHA, SITE } from '@/lib/site';

type Props = {
  /** Reçoit le jeton (à usage unique) quand la vérification réussit, ou null quand il expire. */
  onJeton: (jeton: string | null) => void;
};

/**
 * Vérification « humain » Cloudflare Turnstile (contre la création de comptes en masse).
 * Sur téléphone : la vérification tourne dans une petite page web, rattachée à l'adresse du site Sooqly
 * (seule adresse autorisée pour cette clé). Pour la relancer, changer la prop `key` du composant.
 */
export function Captcha({ onJeton }: Props) {
  const { langue } = usePreferences();
  const html = useMemo(
    () => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=pret" async defer></script>
<style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center}</style></head>
<body><div id="v"></div><script>
function envoyer(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
function pret(){turnstile.render('#v',{sitekey:${JSON.stringify(CLE_CAPTCHA)},language:${JSON.stringify(langue)},theme:'light',
callback:function(t){envoyer({jeton:t});},'expired-callback':function(){envoyer({jeton:null});},'error-callback':function(){envoyer({jeton:null});}});}
</script></body></html>`,
    [langue],
  );
  return (
    <View style={{ height: 70, alignItems: 'center' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: SITE }}
        style={{ width: 310, height: 70, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data) as { jeton: string | null };
            onJeton(m.jeton);
          } catch {
            onJeton(null);
          }
        }}
      />
    </View>
  );
}
