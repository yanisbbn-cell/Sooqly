import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeChevronBas } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { useCharte, type ArticleCharte, type TexteBilingue } from '@/lib/referentiel';
import { colors } from '@/theme';

/** « Notre charte » : basmala, préambule, 13 articles dépliables, conclusion. Texte lu dans Supabase. */
export default function EcranCharte() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue } = usePreferences();
  const { donnees, erreur, reessayer } = useCharte();
  const [ouvert, setOuvert] = useState<number | null>(null);
  const tx = (x: TexteBilingue) => x[langue];

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('charte.titre')} />
      {!donnees ? (
        <EtatChargement erreur={erreur} reessayer={reessayer} />
      ) : (
        <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.preambule}>
            <Texte variante="coran" style={styles.basmala}>
              {t('charte.basmala')}
            </Texte>
            <Texte style={styles.preambuleTexte}>{tx(donnees.textes.preambule)}</Texte>
          </View>

          <View>
            {donnees.articles.map((a, i) => (
              <Article
                key={a.numero}
                article={a}
                premier={i === 0}
                ouvert={ouvert === a.numero}
                basculer={() => setOuvert(ouvert === a.numero ? null : a.numero)}
              />
            ))}
          </View>

          <Texte poids={600} style={styles.conclusion}>
            {tx(donnees.textes.conclusion)}
          </Texte>
          <Texte style={styles.miseAJour}>{tx(donnees.textes.mise_a_jour)}</Texte>
        </ScrollView>
      )}
    </View>
  );
}

function Article({
  article,
  premier,
  ouvert,
  basculer,
}: {
  article: ArticleCharte;
  premier: boolean;
  ouvert: boolean;
  basculer: () => void;
}) {
  const { langue, rtl } = usePreferences();
  const tx = (x: TexteBilingue) => x[langue];
  const titre = langue === 'ar' ? article.titre_ar : article.titre_fr;

  return (
    <View style={[styles.article, !premier && { marginTop: 12 }]}>
      <Pressable
        onPress={basculer}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        style={({ pressed }) => [styles.articleTete, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.numero}>
          <Texte variante="titre" poids={700} style={styles.numeroTexte}>
            {String(article.numero)}
          </Texte>
        </View>
        <Texte variante="titre" poids={700} style={styles.articleTitre}>
          {titre}
        </Texte>
        <View style={ouvert && { transform: [{ rotate: '180deg' }] }}>
          <IconeChevronBas couleur={colors.brunMoyen} />
        </View>
      </Pressable>

      {ouvert && (
        <View style={styles.articleCorps}>
          {article.paragraphes.map((p, i) => (
            <Texte key={`p${i}`} style={styles.paragraphe}>
              {tx(p)}
            </Texte>
          ))}
          {article.puces.map((p, i) => (
            <View key={`b${i}`} style={styles.puce}>
              <Texte poids={700} style={styles.puceSigne}>
                •
              </Texte>
              <Texte style={styles.puceTexte}>{tx(p)}</Texte>
            </View>
          ))}
          {article.citations.map((c, i) => (
            <Fragment key={`q${i}`}>
              <View style={styles.citation}>
                {/* Le texte arabe du Coran et des hadiths s'écrit toujours de droite à gauche, en Amiri. */}
                <Texte variante="coran" style={[styles.citationArabe, { writingDirection: 'rtl', textAlign: 'center' }]}>
                  {c.ar}
                </Texte>
                {!rtl && <Texte style={styles.citationTraduction}>{c.fr}</Texte>}
                <Texte poids={600} style={styles.citationRef}>
                  {langue === 'ar' ? c.ref_ar : c.ref_fr}
                </Texte>
              </View>
            </Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 20, gap: 12 },
  preambule: { backgroundColor: colors.brun, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 16, gap: 10 },
  basmala: { fontSize: 22, color: colors.sable2, textAlign: 'center', writingDirection: 'rtl' },
  preambuleTexte: { fontSize: 14, lineHeight: 24, color: colors.sable1, textAlign: 'center' },
  article: { backgroundColor: colors.carte, borderRadius: 16, overflow: 'hidden' },
  articleTete: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  numero: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexte: { color: colors.sable1, fontSize: 15, textAlign: 'center' },
  articleTitre: { flex: 1, fontSize: 15, lineHeight: 20 },
  articleCorps: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  paragraphe: { fontSize: 14, lineHeight: 24 },
  puce: { flexDirection: 'row', gap: 8 },
  puceSigne: { color: colors.accentFonce, fontSize: 14, lineHeight: 22 },
  puceTexte: { flex: 1, fontSize: 14, lineHeight: 22 },
  citation: { backgroundColor: colors.sable1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 6 },
  citationArabe: { fontSize: 19, lineHeight: 36 },
  citationTraduction: { fontSize: 13, lineHeight: 21, fontStyle: 'italic', textAlign: 'center' },
  citationRef: { fontSize: 12, color: colors.brunMoyen, textAlign: 'center' },
  conclusion: { fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  miseAJour: { fontSize: 12, color: colors.brunMoyen, textAlign: 'center' },
});
