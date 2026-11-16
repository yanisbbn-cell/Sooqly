import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { Texte } from '@/components/Texte';
import { publierArticle, type Bilingue } from '@/lib/admin';
import { estAdmin, useAuth } from '@/lib/auth';
import type { ArticleCharte } from '@/lib/referentiel';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

/** Administrateur : modifier un article de la charte (titres, paragraphes, points) en français et en arabe. */
export default function EditionArticle() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [article, setArticle] = useState<ArticleCharte | null>(null);
  const [erreur, setErreur] = useState(false);
  const [titreFr, setTitreFr] = useState('');
  const [titreAr, setTitreAr] = useState('');
  const [paragraphes, setParagraphes] = useState<Bilingue[]>([]);
  const [puces, setPuces] = useState<Bilingue[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    setErreur(false);
    const { data, error } = await supabase
      .from('charter_articles')
      .select('numero, titre_fr, titre_ar, paragraphes, puces, citations')
      .eq('numero', Number(numero))
      .maybeSingle();
    if (error || !data) return setErreur(true);
    const a = data as ArticleCharte;
    setArticle(a);
    setTitreFr(a.titre_fr);
    setTitreAr(a.titre_ar);
    setParagraphes(a.paragraphes.map((p) => ({ fr: p.fr, ar: p.ar })));
    setPuces(a.puces.map((p) => ({ fr: p.fr, ar: p.ar })));
  }, [numero]);

  useEffect(() => {
    if (estAdmin(profil)) charger();
  }, [charger, profil]);

  if (!estAdmin(profil) || !article) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('reglages.charte')} />
        {estAdmin(profil) && <EtatChargement erreur={erreur} reessayer={charger} />}
      </View>
    );
  }

  const publier = async () => {
    setOccupe(true);
    setMessage(null);
    const ok = await publierArticle(article.numero, titreFr, titreAr, paragraphes, puces);
    setOccupe(false);
    setMessage({ ok, texte: ok ? t('charteEdition.publiee') : t('charteEdition.erreur') });
    if (ok) setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/moderation/reglages')), 1200);
  };

  const blocs = (liste: Bilingue[], maj: (l: Bilingue[]) => void, cle: 'paragraphe' | 'puce') =>
    liste.map((p, i) => (
      <View key={`${cle}-${i}`} style={styles.bloc}>
        <Texte poids={700} style={{ fontSize: 13, color: colors.brunMoyen }}>
          {t(`charteEdition.${cle}`, { n: i + 1 })}
        </Texte>
        <Champ
          libelle={t('charteEdition.fr')}
          value={p.fr}
          onChangeText={(v) => maj(liste.map((x, j) => (j === i ? { ...x, fr: v } : x)))}
          multiline
          maxLength={2000}
        />
        <Champ
          libelle={t('charteEdition.ar')}
          value={p.ar}
          onChangeText={(v) => maj(liste.map((x, j) => (j === i ? { ...x, ar: v } : x)))}
          multiline
          maxLength={2000}
          style={{ writingDirection: 'rtl', textAlign: 'right' }}
        />
      </View>
    ));

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t('charteEdition.titre', { n: article.numero })} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Champ libelle={t('charteEdition.titreFr')} value={titreFr} onChangeText={setTitreFr} maxLength={120} />
        <Champ
          libelle={t('charteEdition.titreAr')}
          value={titreAr}
          onChangeText={setTitreAr}
          maxLength={120}
          style={{ writingDirection: 'rtl', textAlign: 'right' }}
        />
        {blocs(paragraphes, setParagraphes, 'paragraphe')}
        {blocs(puces, setPuces, 'puce')}
        {article.citations.length > 0 && <Texte style={styles.aide}>{t('charteEdition.citations')}</Texte>}
        {message && (
          <Texte poids={600} style={{ fontSize: 13, color: message.ok ? colors.vert : colors.rouge }} accessibilityLiveRegion="polite">
            {message.texte}
          </Texte>
        )}
        <Bouton libelle={t('charteEdition.publier')} onPress={publier} occupe={occupe} actif={!!titreFr.trim() && !!titreAr.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 14 },
  bloc: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.carte },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
});
