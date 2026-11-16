import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ, Libelle } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { Texte } from '@/components/Texte';
import { useAuth } from '@/lib/auth';
import { preparer, prendrePhoto } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { envoyerRetour } from '@/lib/retours';
import { colors, fonts } from '@/theme';

/** Versions de test : « Signaler un problème » (texte, écran concerné, capture d'écran facultative). */
export default function Retour() {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const { profil } = useAuth();
  const [message, setMessage] = useState('');
  const [ecran, setEcran] = useState('');
  const [capture, setCapture] = useState<{ uri: string; base64: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [etat, setEtat] = useState<'saisie' | 'ok' | 'erreur'>('saisie');

  const choisirCapture = async () => {
    const uri = await prendrePhoto('galerie');
    if (!uri) return;
    const p = await preparer(uri);
    setCapture({ uri: p.uri, base64: p.base64 });
  };

  const envoyer = async () => {
    if (message.trim().length < 3 || occupe) return;
    setOccupe(true);
    const ok = await envoyerRetour(profil?.id ?? null, message, ecran, capture);
    setOccupe(false);
    setEtat(ok ? 'ok' : 'erreur');
    if (ok) {
      setMessage('');
      setEcran('');
      setCapture(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t('retour.titre')} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {etat === 'ok' ? (
          <>
            <View style={styles.merci}>
              <Texte poids={700} style={{ fontSize: 15, color: colors.vert }} accessibilityLiveRegion="polite">
                {t('retour.merci')}
              </Texte>
            </View>
            <Bouton libelle={t('retour.nouveau')} onPress={() => setEtat('saisie')} variante="contour" />
          </>
        ) : (
          <>
            <Texte style={styles.aide}>{t('retour.intro')}</Texte>
            <Libelle>{t('retour.message')}</Libelle>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t('retour.messageAide')}
              placeholderTextColor={colors.brunMoyen}
              accessibilityLabel={t('retour.message')}
              multiline
              maxLength={4000}
              style={[styles.zone, { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' }]}
            />
            <Champ libelle={t('retour.ecran')} placeholder={t('retour.ecranEx')} value={ecran} onChangeText={setEcran} maxLength={200} />
            {profil ? (
              <Pressable
                onPress={capture ? () => setCapture(null) : choisirCapture}
                accessibilityRole="button"
                style={styles.capture}
              >
                {capture && <Image source={{ uri: capture.uri }} style={styles.vignette} />}
                <Texte poids={700} style={{ fontSize: 14, flex: 1 }}>
                  {capture ? t('retour.captureChoisie') : t('retour.capture')}
                </Texte>
              </Pressable>
            ) : (
              <Texte style={styles.aide}>{t('retour.captureConnexion')}</Texte>
            )}
            {etat === 'erreur' && (
              <Texte poids={600} style={{ fontSize: 13, color: colors.rouge }} accessibilityRole="alert">
                {t('retour.erreur')}
              </Texte>
            )}
            <Bouton libelle={t('retour.envoyer')} onPress={envoyer} actif={message.trim().length >= 3} occupe={occupe} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 12 },
  aide: { fontSize: 13, lineHeight: 19, color: colors.brunMoyen },
  zone: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
    padding: 12,
    fontSize: 15,
    color: colors.brun,
    textAlignVertical: 'top',
  },
  capture: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.sable4,
  },
  vignette: { width: 44, height: 44, borderRadius: 8 },
  merci: { padding: 14, borderRadius: 14, backgroundColor: colors.vertFond, borderWidth: 1, borderColor: colors.vertBord },
});
