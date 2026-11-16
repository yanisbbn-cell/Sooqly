import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type FlatList as TypeFlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EtatChargement } from '@/components/EtatChargement';
import { Bouton } from '@/components/Bouton';
import { IconeEnvoyer, IconeLieu, IconeOptions, IconeRetour } from '@/components/Icones';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { BulleMessage } from '@/components/messagerie/BulleMessage';
import { IconePermis } from '@/components/messagerie/BullePermis';
import { MicroMaintenu } from '@/components/messagerie/MicroMaintenu';
import { FeuilleLieu } from '@/components/messagerie/FeuilleLieu';
import { FeuilleConfirmation } from '@/components/confiance/FeuilleConfirmation';
import { FeuilleNote } from '@/components/confiance/FeuilleNote';
import { FeuilleOptions } from '@/components/confiance/FeuilleOptions';
import { FeuilleSignalement } from '@/components/confiance/FeuilleSignalement';
import { useAuth } from '@/lib/auth';
import {
  bloquer,
  debloquer,
  declarerVente,
  estBloque,
  oublierBadge,
  transactionDeLAnnonce,
  transactionsANoter,
  type TransactionANoter,
} from '@/lib/confiance';
import {
  ARNAQUE,
  ecouterMessages,
  envoyerLieu,
  envoyerTexte,
  envoyerVocal,
  lireDiscussion,
  lireMessages,
  marquerLus,
  type Message,
} from '@/lib/messagerie';
import { useNonLus } from '@/lib/notifications';
import { usePreferences } from '@/lib/preferences';
import { ecrire, lire } from '@/lib/stockage';
import { supabase } from '@/lib/supabase';
import { colors, fonts, toucheMin } from '@/theme';

type Autre = { id: string; nom: string; avatar: number | null };

/** Une discussion, en temps réel : conseils de prudence, réponses rapides, mise en garde contre les demandes d'avance. */
export default function Discussion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { rtl } = usePreferences();
  const { profil } = useAuth();
  const { rafraichir: rafraichirNonLus } = useNonLus();
  const liste = useRef<TypeFlatList<Message>>(null);

  const [annonce, setAnnonce] = useState<{
    id: string;
    titre: string;
    permis_exige: boolean;
    categorie: string;
    type: string;
    statut: string;
  } | null>(null);
  const [vendeurId, setVendeurId] = useState<string | null>(null);
  const [autre, setAutre] = useState<Autre | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [prudence, setPrudence] = useState(false);
  const [feuilleLieu, setFeuilleLieu] = useState(false);
  // Étape 9 : confiance.
  const [jeBloque, setJeBloque] = useState(false);
  const [conclue, setConclue] = useState(false);
  const [aNoter, setANoter] = useState<TransactionANoter | null>(null);
  const [feuille, setFeuille] = useState<null | 'options' | 'signaler' | 'bloquer' | 'vendre' | 'noter'>(null);
  const [merciNote, setMerciNote] = useState(false);
  const [dejaConclue, setDejaConclue] = useState(false);
  const clePrudence = `sooqly.prudence.${id}`;

  // Blocage, vente déjà conclue, note à donner pour cette annonce.
  const chargerConfiance = useCallback(
    async (annonceId: string, autreId: string) => {
      if (!profil) return;
      const [b, tx, liste] = await Promise.all([
        estBloque(profil.id, autreId),
        transactionDeLAnnonce(annonceId),
        transactionsANoter().catch(() => [] as TransactionANoter[]),
      ]);
      setJeBloque(b);
      setConclue(!!tx);
      setANoter(liste.find((x) => x.annonce_id === annonceId && x.autre_id === autreId && !x.note_id) ?? null);
    },
    [profil],
  );

  const charger = useCallback(async () => {
    if (!profil) return;
    try {
      const d = await lireDiscussion(String(id));
      if (!d) {
        setIntrouvable(true);
        return;
      }
      const autreId = d.acheteur_id === profil.id ? d.vendeur_id : d.acheteur_id;
      const [a, p, m] = await Promise.all([
        supabase.from('listings').select('id, titre, permis_exige, categorie, type, statut').eq('id', d.annonce_id).maybeSingle(),
        supabase.from('profiles').select('id, nom_affiche, avatar, est_pro, nom_commercial').eq('id', autreId).maybeSingle(),
        lireMessages(d.id),
      ]);
      setAnnonce(a.data as typeof annonce);
      setVendeurId(d.vendeur_id);
      if (p.data)
        setAutre({ id: p.data.id, nom: p.data.est_pro && p.data.nom_commercial ? p.data.nom_commercial : p.data.nom_affiche, avatar: p.data.avatar });
      setMessages(m);
      marquerLus(d.id, profil.id).then(rafraichirNonLus);
      chargerConfiance(d.annonce_id, autreId);
    } catch {
      setIntrouvable(true);
    }
  }, [id, profil, rafraichirNonLus, chargerConfiance]);

  useEffect(() => {
    charger();
    lire(clePrudence).then((v) => setPrudence(v !== '1'));
  }, [charger, clePrudence]);

  // Temps réel : les messages de cette discussion arrivent sans recharger.
  useEffect(() => {
    if (!profil) return;
    const canal = ecouterMessages(`discussion-${id}`, `conversation_id=eq.${id}`, (m) => {
      setMessages((liste) => (liste && !liste.some((x) => x.id === m.id) ? [...liste, m] : liste));
      if (m.auteur_id !== profil.id) marquerLus(String(id), profil.id).then(rafraichirNonLus);
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [id, profil, rafraichirNonLus]);

  useEffect(() => {
    if (messages?.length) setTimeout(() => liste.current?.scrollToEnd({ animated: true }), 50);
  }, [messages?.length]);

  const envoyer = async (texte: string) => {
    if (!profil || !texte.trim() || envoi) return;
    setEnvoi(true);
    setErreur(false);
    const ok = await envoyerTexte(String(id), profil.id, texte);
    setEnvoi(false);
    if (!ok) return setErreur(true);
    setBrouillon('');
    // Au cas où le temps réel tarde : on relit la discussion.
    setMessages(await lireMessages(String(id)));
  };

  const apres = async (ok: boolean) => {
    setEnvoi(false);
    if (!ok) return setErreur(true);
    setMessages(await lireMessages(String(id)));
  };
  const envoyerEnregistrement = async (uri: string, secondes: number, onde: number[]) => {
    if (!profil) return;
    setEnvoi(true);
    setErreur(false);
    await apres(await envoyerVocal(String(id), profil.id, uri, secondes, onde));
  };
  const envoyerLeLieu = async (nom: string, position: { lat: number; lng: number } | null) => {
    if (!profil) return;
    setEnvoi(true);
    setErreur(false);
    const ok = await envoyerLieu(String(id), profil.id, nom, position);
    setFeuilleLieu(false);
    await apres(ok);
  };

  const confirmerBlocage = async () => {
    if (!profil || !autre) return;
    if (await bloquer(profil.id, autre.id)) setJeBloque(true);
    setFeuille(null);
  };
  const leverBlocage = async () => {
    if (!profil || !autre) return;
    if (await debloquer(profil.id, autre.id)) setJeBloque(false);
    setFeuille(null);
  };
  const confirmerVente = async () => {
    if (!profil || !autre || !annonce) return;
    const r = await declarerVente(annonce.id, profil.id, autre.id);
    if (!r.id) {
      setFeuille(null);
      if (r.deja) setDejaConclue(true);
      return;
    }
    setConclue(true);
    setAnnonce({ ...annonce, statut: annonce.type === 'location' ? 'loue' : 'vendu' });
    const liste = await transactionsANoter().catch(() => [] as TransactionANoter[]);
    const tx = liste.find((x) => x.transaction_id === r.id) ?? null;
    setANoter(tx);
    // Comme dans la maquette : la notation s'ouvre tout de suite.
    setFeuille(tx ? 'noter' : null);
  };

  const fermerPrudence = () => {
    setPrudence(false);
    ecrire(clePrudence, '1');
  };

  const dernierRecu = [...(messages ?? [])].reverse().find((m) => m.auteur_id !== profil?.id);
  const alerteArnaque = ARNAQUE.test(brouillon) || (!!dernierRecu?.contenu && ARNAQUE.test(dernierRecu.contenu));
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/messages'));
  const jeVends = !!profil && vendeurId === profil.id;
  const peutConclure = jeVends && !conclue && !!annonce && ['en_ligne', 'reserve'].includes(annonce.statut);
  const location = annonce?.type === 'location';

  if (!profil || introuvable) {
    return (
      <View style={[styles.ecran, { paddingTop: insets.top + 20, padding: 20, gap: 12 }]}>
        <Texte style={{ fontSize: 15 }}>{t('messagerie.introuvable')}</Texte>
        <Pressable onPress={retour} accessibilityRole="button" style={{ minHeight: toucheMin, justifyContent: 'center' }}>
          <Texte poids={700} style={{ textDecorationLine: 'underline' }}>
            {t('commun.retour')}
          </Texte>
        </Pressable>
      </View>
    );
  }

  const champ = (
    <TextInput
      value={brouillon}
      onChangeText={setBrouillon}
      placeholder={t('messagerie.champ')}
      placeholderTextColor={colors.brunMoyen}
      accessibilityLabel={t('messagerie.champ')}
      multiline
      maxLength={1000}
      style={[styles.champ, { fontFamily: rtl ? fonts.arabe[400] : fonts.texte[400], textAlign: rtl ? 'right' : 'left' }]}
    />
  );

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.entete, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={t('commun.retour')} style={styles.retour}>
          <View style={rtl && { transform: [{ scaleX: -1 }] }}>
            <IconeRetour couleur={colors.sable1} />
          </View>
        </Pressable>
        <ImageProfil numero={autre?.avatar} taille={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Texte poids={700} style={{ fontSize: 15, color: colors.sable1 }} numberOfLines={1}>
            {autre?.nom ?? ''}
          </Texte>
          <Texte style={{ fontSize: 12, color: colors.sable3 }} numberOfLines={1}>
            {annonce?.titre ?? ''}
          </Texte>
        </View>
        {annonce && (
          <Pressable
            onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: annonce.id } })}
            accessibilityRole="button"
            style={styles.voir}
          >
            <Texte poids={700} style={{ fontSize: 12, color: colors.sable1 }}>
              {t('messagerie.voirAnnonce')}
            </Texte>
          </Pressable>
        )}
        {autre && (
          <Pressable
            onPress={() => setFeuille('options')}
            accessibilityRole="button"
            accessibilityLabel={t('confiance.options')}
            style={styles.options}
          >
            <IconeOptions couleur={colors.sable1} />
          </Pressable>
        )}
      </View>

      {aNoter && (
        <View style={styles.aNoter} accessibilityRole="summary">
          <View style={{ flex: 1, gap: 2 }}>
            <Texte poids={700} style={{ fontSize: 14 }}>
              {t('confiance.transactionTerminee')}
            </Texte>
            <Texte style={{ fontSize: 12, lineHeight: 17, color: colors.brunMoyen }} numberOfLines={2}>
              {t(
                aNoter.mon_role === 'acheteur'
                  ? location
                    ? 'confiance.aNoterLocataire'
                    : 'confiance.aNoterAchat'
                  : location
                    ? 'confiance.aNoterLocation'
                    : 'confiance.aNoterVente',
                { titre: aNoter.titre, nom: aNoter.autre_nom },
              )}
            </Texte>
          </View>
          <Pressable onPress={() => setFeuille('noter')} accessibilityRole="button" style={styles.noter}>
            <Texte poids={700} style={{ fontSize: 14, color: colors.sable1 }}>
              {t('confiance.noter')}
            </Texte>
          </Pressable>
        </View>
      )}
      {merciNote && (
        <Pressable onPress={() => setMerciNote(false)} accessibilityRole="button" style={styles.merci}>
          <Texte style={{ fontSize: 13, lineHeight: 19 }}>
            <Texte poids={700} style={{ fontSize: 13 }}>
              {t('confiance.merciNote')}
            </Texte>{' '}
            {t('confiance.merciNoteTexte')}
          </Texte>
        </Pressable>
      )}
      {dejaConclue && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge, paddingHorizontal: 16, paddingTop: 8 }} accessibilityRole="alert">
          {t('confiance.dejaConclue')}
        </Texte>
      )}

      {!messages ? (
        <EtatChargement erreur={false} reessayer={charger} />
      ) : (
        <FlatList
          ref={liste}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.fil}
          ListHeaderComponent={
            prudence ? (
              <View style={styles.prudence}>
                <Texte poids={700} style={{ fontSize: 15, color: colors.vert }}>
                  {t('messagerie.prudentTitre')}
                </Texte>
                {(t('messagerie.prudent', { returnObjects: true }) as unknown as string[]).map((c) => (
                  <Texte key={c} style={{ fontSize: 13, lineHeight: 19 }}>
                    • {c}
                  </Texte>
                ))}
                <Pressable onPress={fermerPrudence} accessibilityRole="button" style={styles.compris}>
                  <Texte poids={700} style={{ fontSize: 13, color: colors.vert }}>
                    {t('messagerie.compris')}
                  </Texte>
                </Pressable>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => <BulleMessage message={item} moi={item.auteur_id === profil.id} jeSuisLoueur={vendeurId === profil.id} />}
        />
      )}

      {alerteArnaque && (
        <View style={styles.alerte} accessibilityRole="alert">
          <Texte poids={600} style={{ fontSize: 12, lineHeight: 18, color: colors.rouge }}>
            {t('messagerie.arnaque')}
          </Texte>
        </View>
      )}
      {erreur && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge, paddingHorizontal: 16 }}>
          {t('messagerie.erreurEnvoi')}
        </Texte>
      )}

      {jeBloque ? (
        <View style={[styles.bloque, { paddingBottom: insets.bottom + 12 }]}>
          <Texte style={{ fontSize: 13, lineHeight: 19, color: colors.rouge }}>{t('confiance.bloque')}</Texte>
          <Bouton libelle={t('confiance.debloquer')} onPress={leverBlocage} variante="contour" />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.reponses}
          >
            {(t('messagerie.reponses', { returnObjects: true }) as unknown as string[]).map((r) => (
              <Pressable key={r} onPress={() => envoyer(r)} accessibilityRole="button" style={styles.reponse}>
                <Texte poids={600} style={{ fontSize: 13 }}>
                  {r}
                </Texte>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.saisie, { paddingBottom: insets.bottom + 8 }]}>
            {brouillon.trim() ? (
              <>
                <Pressable
                  onPress={() => setFeuilleLieu(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('messagerie.proposerLieu')}
                  style={styles.outil}
                >
                  <IconeLieu couleur={colors.brun} />
                </Pressable>
                {champ}
                <Pressable
                  onPress={() => envoyer(brouillon)}
                  disabled={envoi}
                  accessibilityRole="button"
                  accessibilityLabel={t('messagerie.envoyer')}
                  style={styles.envoyer}
                >
                  <View style={rtl && { transform: [{ scaleX: -1 }] }}>
                    <IconeEnvoyer couleur={colors.blanc} />
                  </View>
                </Pressable>
              </>
            ) : (
              <MicroMaintenu
                rtl={rtl}
                desactive={envoi}
                onEnvoyer={envoyerEnregistrement}
                gauche={
                  <>
                    <Pressable
                      onPress={() => setFeuilleLieu(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('messagerie.proposerLieu')}
                      style={styles.outil}
                    >
                      <IconeLieu couleur={colors.brun} />
                    </Pressable>
                    {annonce?.permis_exige && vendeurId !== profil.id && (
                      <Pressable
                        onPress={() => router.push({ pathname: '/permis/[id]', params: { id: annonce.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={t('permis.joindre')}
                        style={styles.outil}
                      >
                        <IconePermis couleur={colors.brun} />
                      </Pressable>
                    )}
                    {champ}
                  </>
                }
              />
            )}
          </View>
        </>
      )}

      <FeuilleOptions
        visible={feuille === 'options'}
        onFermer={() => setFeuille(null)}
        options={[
          ...(peutConclure
            ? [{ libelle: t(location ? 'confiance.jaiLoue' : 'confiance.jaiVendu'), onPress: () => setFeuille('vendre'), accent: true }]
            : []),
          ...(autre ? [{ libelle: t('confiance.voirProfil'), onPress: () => { setFeuille(null); router.push({ pathname: '/membre/[id]', params: { id: autre.id } }); } }] : []),
          { libelle: t('confiance.signalerMembre'), onPress: () => setFeuille('signaler') },
          jeBloque
            ? { libelle: t('confiance.debloquer'), onPress: leverBlocage }
            : { libelle: t('confiance.bloquerMembre'), onPress: () => setFeuille('bloquer'), danger: true },
        ]}
      />
      <FeuilleSignalement
        visible={feuille === 'signaler'}
        signalement={autre ? { genre: 'membre', membreViseId: autre.id, conversationId: String(id) } : null}
        nom={autre?.nom}
        onFermer={() => setFeuille(null)}
        onBloquer={jeBloque ? undefined : () => setFeuille('bloquer')}
      />
      <FeuilleConfirmation
        visible={feuille === 'bloquer'}
        titre={t('confiance.bloquerQ', { nom: autre?.nom ?? '' })}
        texte={t('confiance.bloquerTexte')}
        libelle={t('confiance.bloquer')}
        danger
        onConfirmer={confirmerBlocage}
        onFermer={() => setFeuille(null)}
      />
      <FeuilleConfirmation
        visible={feuille === 'vendre'}
        titre={t(location ? 'confiance.loueQ' : 'confiance.venduQ', { nom: autre?.nom ?? '' })}
        texte={t(location ? 'confiance.loueTexte' : 'confiance.venduTexte')}
        libelle={t('confiance.confirmer')}
        onConfirmer={confirmerVente}
        onFermer={() => setFeuille(null)}
      />
      {feuille === 'noter' && (
        <FeuilleNote
          transaction={aNoter}
          onFermer={() => setFeuille(null)}
          onNote={() => {
            if (aNoter) oublierBadge(aNoter.autre_id);
            setFeuille(null);
            setANoter(null);
            setMerciNote(true);
          }}
        />
      )}

      <FeuilleLieu visible={feuilleLieu} onFermer={() => setFeuilleLieu(false)} onEnvoyer={envoyerLeLieu} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: { backgroundColor: colors.brun, paddingBottom: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  retour: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  options: { width: 40, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  aNoter: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.carte,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noter: { minHeight: toucheMin, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.brun, justifyContent: 'center' },
  merci: { margin: 12, marginBottom: 0, padding: 12, borderRadius: 14, backgroundColor: colors.sable2 },
  bloque: { paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.sable2 },
  voir: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.sable3, justifyContent: 'center' },
  fil: { padding: 16, gap: 8 },
  prudence: {
    backgroundColor: colors.vertFond,
    borderWidth: 1,
    borderColor: colors.vertBord,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    marginBottom: 8,
  },
  compris: { alignSelf: 'flex-end', minHeight: toucheMin, justifyContent: 'center', paddingHorizontal: 6 },
  alerte: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 12, backgroundColor: colors.rougeFond, borderWidth: 1, borderColor: colors.rouge },
  reponses: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' },
  reponse: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    justifyContent: 'center',
  },
  saisie: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.sable2 },
  champ: {
    flex: 1,
    minHeight: toucheMin,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: colors.brun,
  },
  outil: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  envoyer: { width: toucheMin, height: toucheMin, borderRadius: toucheMin / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
