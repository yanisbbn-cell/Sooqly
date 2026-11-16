import { useCallback, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Champ } from '@/components/Champ';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { ImageProfil } from '@/components/ImageProfil';
import { Pastille } from '@/components/Pastille';
import { Texte } from '@/components/Texte';
import {
  DUREES_MISE_EN_AVANT,
  ajouterMotInterdit,
  enregistrerReglages,
  enregistrerTarifs,
  equipeModeration,
  retirerMotInterdit,
  type MembreEquipe,
} from '@/lib/admin';
import { estAdmin, useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre, lirePrix } from '@/lib/prix';
import type { ArticleCharte, FamilleInterdite, Reglages } from '@/lib/referentiel';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

type Donnees = { reglages: Reglages; familles: FamilleInterdite[]; articles: ArticleCharte[]; equipe: MembreEquipe[] };

/** Réglages de l'administrateur : valeurs générales, tarifs de mise en avant, mots interdits, charte, équipe. */
export default function EcranReglages() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);

  // Lecture directe (pas la mémoire partagée de l'appli) : on voit toujours les dernières valeurs.
  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [r, f, a, e] = await Promise.all([
        supabase
          .from('settings')
          .select('taux_dinar_euro, seuil_badge, duree_vie_annonce_jours, rappel_expiration_jours, tarifs_mise_en_avant')
          .eq('id', 1)
          .single(),
        supabase.from('banned_families').select('cle, effet, motif_fr, motif_ar, termes:banned_terms(langue, terme)').order('cle'),
        supabase.from('charter_articles').select('numero, titre_fr, titre_ar, paragraphes, puces, citations').order('numero'),
        equipeModeration(),
      ]);
      if (r.error || f.error || a.error) throw new Error('lecture');
      setD({
        reglages: { ...(r.data as Reglages), taux_dinar_euro: Number(r.data.taux_dinar_euro) },
        familles: f.data as FamilleInterdite[],
        articles: a.data as ArticleCharte[],
        equipe: e,
      });
    } catch {
      setErreur(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (estAdmin(profil)) charger();
    }, [charger, profil]),
  );

  if (!estAdmin(profil) || !d) {
    return (
      <View style={styles.ecran}>
        <EnTeteRetour titre={t('reglages.titre')} />
        {estAdmin(profil) && <EtatChargement erreur={erreur} reessayer={charger} />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTeteRetour titre={t('reglages.titre')} />
      <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Ligne libelle={t('retour.admin')} onPress={() => router.push('/moderation/retours')} />
        <BlocValeurs reglages={d.reglages} />
        <BlocTarifs tarifs={d.reglages.tarifs_mise_en_avant ?? {}} />
        <BlocMots familles={d.familles} onChange={charger} />
        <Section titre={t('reglages.charte')} aide={t('reglages.charteAide')}>
          {d.articles.map((a) => (
            <Ligne
              key={a.numero}
              libelle={`${t('reglages.article', { n: a.numero })} · ${a.titre_fr}`}
              onPress={() => router.push({ pathname: '/moderation/charte/[numero]', params: { numero: String(a.numero) } })}
            />
          ))}
        </Section>
        <Section titre={t('reglages.equipe')} aide={t('reglages.equipeAide')}>
          {d.equipe.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push({ pathname: '/moderation/membre/[id]', params: { id: m.id } })}
              accessibilityRole="button"
              style={styles.membre}
            >
              <ImageProfil numero={m.avatar} taille={36} />
              <Texte poids={700} style={{ flex: 1, fontSize: 14 }}>
                {m.nom_affiche}
              </Texte>
              <Texte style={styles.aide}>{m.role === 'admin' ? t('reglages.admin') : t('reglages.moderateur')}</Texte>
            </Pressable>
          ))}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BlocValeurs({ reglages }: { reglages: Reglages }) {
  const { t } = useTranslation();
  // Le taux est saisi pour 1 000 DA (ex. 3,70 €), plus parlant qu'un taux par dinar.
  const [taux, setTaux] = useState(String(Math.round(reglages.taux_dinar_euro * 1000 * 100) / 100).replace('.', ','));
  const [seuil, setSeuil] = useState(String(reglages.seuil_badge));
  const [duree, setDuree] = useState(String(reglages.duree_vie_annonce_jours));
  const [rappel, setRappel] = useState(String(reglages.rappel_expiration_jours));
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const enregistrer = async () => {
    const tauxMille = Number(taux.replace(',', '.').replace(/\s/g, ''));
    const valeurs = {
      taux_dinar_euro: tauxMille / 1000,
      seuil_badge: parseInt(seuil, 10),
      duree_vie_annonce_jours: parseInt(duree, 10),
      rappel_expiration_jours: parseInt(rappel, 10),
    };
    if (!(tauxMille > 0) || Object.values(valeurs).some((v) => !Number.isFinite(v) || v <= 0)) {
      return setMessage({ ok: false, texte: t('reglages.invalide') });
    }
    setOccupe(true);
    const ok = await enregistrerReglages(valeurs);
    setOccupe(false);
    setMessage({ ok, texte: ok ? t('reglages.enregistre') : t('reglages.erreur') });
  };

  return (
    <Section titre={t('reglages.valeurs')}>
      <Champ ltr libelle={t('reglages.taux')} value={taux} onChangeText={setTaux} keyboardType="decimal-pad" maxLength={8} />
      <Texte style={styles.aide}>{t('reglages.tauxAide')}</Texte>
      <Champ ltr libelle={t('reglages.seuil')} value={seuil} onChangeText={setSeuil} keyboardType="number-pad" maxLength={4} />
      <Champ ltr libelle={t('reglages.duree')} value={duree} onChangeText={setDuree} keyboardType="number-pad" maxLength={3} />
      <Champ ltr libelle={t('reglages.rappel')} value={rappel} onChangeText={setRappel} keyboardType="number-pad" maxLength={2} />
      <Message message={message} />
      <Bouton libelle={t('reglages.enregistrer')} onPress={enregistrer} occupe={occupe} />
    </Section>
  );
}

function BlocTarifs({ tarifs }: { tarifs: Record<string, number> }) {
  const { t } = useTranslation();
  const [saisis, setSaisis] = useState<Record<string, string>>(() =>
    Object.fromEntries(DUREES_MISE_EN_AVANT.map((j) => [String(j), tarifs[String(j)] ? formaterNombre(tarifs[String(j)]!) : ''])),
  );
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const enregistrer = async () => {
    const valeurs: Record<string, number> = {};
    for (const [j, v] of Object.entries(saisis)) {
      if (!v.trim()) continue;
      const prix = lirePrix(v);
      if (prix === null || prix <= 0) return setMessage({ ok: false, texte: t('reglages.invalide') });
      valeurs[j] = prix;
    }
    setOccupe(true);
    const ok = await enregistrerTarifs(valeurs);
    setOccupe(false);
    setMessage({ ok, texte: ok ? t('reglages.enregistre') : t('reglages.erreur') });
  };

  return (
    <Section titre={t('reglages.tarifs')} aide={t('reglages.tarifsAide')}>
      {DUREES_MISE_EN_AVANT.map((j) => (
        <View key={j} style={styles.ligneTarif}>
          <Texte poids={600} style={{ flex: 1, fontSize: 14 }}>
            {t('reglages.jours', { n: j })}
          </Texte>
          <View style={{ width: 150 }}>
            <Champ
              ltr
              accessibilityLabel={t('reglages.jours', { n: j })}
              placeholder="—"
              value={saisis[String(j)] ?? ''}
              onChangeText={(v) => setSaisis({ ...saisis, [String(j)]: v })}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <Texte poids={700}>{t('da')}</Texte>
        </View>
      ))}
      <Message message={message} />
      <Bouton libelle={t('reglages.enregistrer')} onPress={enregistrer} occupe={occupe} />
    </Section>
  );
}

function BlocMots({ familles, onChange }: { familles: FamilleInterdite[]; onChange: () => void }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [mot, setMot] = useState('');
  const [langueMot, setLangueMot] = useState<'fr' | 'ar'>('fr');
  const [erreur, setErreur] = useState(false);

  const agir = async (action: () => Promise<boolean>) => {
    setErreur(false);
    if (await action()) onChange();
    else setErreur(true);
  };

  return (
    <Section titre={t('reglages.mots')} aide={t('reglages.motsAide')}>
      {erreur && <Message message={{ ok: false, texte: t('reglages.erreur') }} />}
      {familles.map((f) => (
        <View key={f.cle} style={styles.famille}>
          <Pressable
            onPress={() => setOuverte(ouverte === f.cle ? null : f.cle)}
            accessibilityRole="button"
            accessibilityState={{ expanded: ouverte === f.cle }}
            style={styles.familleTete}
          >
            <Texte poids={700} style={{ flex: 1, fontSize: 14 }}>
              {langue === 'ar' ? f.motif_ar : f.motif_fr}
            </Texte>
            <Texte style={styles.aide}>{f.termes.length}</Texte>
          </Pressable>
          {ouverte === f.cle && (
            <View style={{ gap: 10 }}>
              <View style={styles.mots}>
                {[...f.termes]
                  .sort((a, b) => a.langue.localeCompare(b.langue) || a.terme.localeCompare(b.terme))
                  .map((x) => (
                    <Pressable
                      key={`${x.langue}-${x.terme}`}
                      onPress={() => agir(() => retirerMotInterdit(f.cle, x.langue, x.terme))}
                      accessibilityRole="button"
                      accessibilityLabel={t('reglages.retirerMot', { mot: x.terme })}
                      style={styles.mot}
                    >
                      <Texte style={{ fontSize: 13 }}>{x.terme} ×</Texte>
                    </Pressable>
                  ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pastille libelle={t('reglages.francais')} choisi={langueMot === 'fr'} onPress={() => setLangueMot('fr')} />
                <Pastille libelle={t('reglages.arabe')} choisi={langueMot === 'ar'} onPress={() => setLangueMot('ar')} />
              </View>
              <Champ libelle={t('reglages.ajouterMot')} value={mot} onChangeText={setMot} maxLength={40} autoCapitalize="none" />
              <Bouton
                libelle={t('reglages.ajouter')}
                onPress={() =>
                  agir(async () => {
                    const ok = await ajouterMotInterdit(f.cle, langueMot, mot);
                    if (ok) setMot('');
                    return ok;
                  })
                }
                actif={!!mot.trim()}
                variante="sombre"
              />
            </View>
          )}
        </View>
      ))}
    </Section>
  );
}

function Section({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Texte variante="titre" poids={700} style={{ fontSize: 17 }} accessibilityRole="header">
        {titre}
      </Texte>
      {aide ? <Texte style={styles.aide}>{aide}</Texte> : null}
      {children}
    </View>
  );
}

function Ligne({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.ligne}>
      <Texte poids={600} style={{ fontSize: 14 }} numberOfLines={1}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

function Message({ message }: { message: { ok: boolean; texte: string } | null }) {
  if (!message) return null;
  return (
    <Texte poids={600} style={{ fontSize: 13, color: message.ok ? colors.vert : colors.rouge }} accessibilityLiveRegion="polite">
      {message.texte}
    </Texte>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 22 },
  section: { gap: 10 },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  ligneTarif: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  famille: { borderRadius: 12, backgroundColor: colors.carte, padding: 12, gap: 10 },
  familleTete: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 8 },
  mots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mot: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.blanc, borderWidth: 1, borderColor: colors.sable2 },
  ligne: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.carte },
  membre: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.carte },
});
