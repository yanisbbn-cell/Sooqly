import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BoutonLangue } from '@/components/BoutonLangue';
import { Champ, Libelle, styleChamp } from '@/components/Champ';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeChevronBas, IconeCoche } from '@/components/Icones';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { MOT_DE_PASSE_MIN, useAuth, type ErreurCompte } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { numeroWilaya, useWilayas } from '@/lib/referentiel';
import { PAYS, nettoyer, numeroComplet, numeroValide, type Pays } from '@/lib/telephone';
import { colors, toucheMin } from '@/theme';

import { FeuilleImagesProfil } from './FeuilleImagesProfil';
import { FeuillePays } from './FeuillePays';

type Mode = 'connexion' | 'inscription';

/** Écran Compte quand on n'est pas connecté : onglets Connexion / Inscription (un seul écran, comme la maquette). */
export function FormulaireCompte() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue, rtl } = usePreferences();
  const auth = useAuth();
  const { donnees: wilayas } = useWilayas();

  const [mode, setMode] = useState<Mode>('connexion');
  const inscription = mode === 'inscription';

  const [modeNom, setModeNom] = useState<'nom' | 'kounia'>('nom');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [kounia, setKounia] = useState('');
  const [avatar, setAvatar] = useState<number | null>(null);
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState<Pays>(PAYS[0]!);
  const [feuillePays, setFeuillePays] = useState(false);
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [charte, setCharte] = useState(false);

  const [feuilleImages, setFeuilleImages] = useState(false);
  const [feuilleWilayas, setFeuilleWilayas] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<ErreurCompte | null>(null);

  const nomAffiche = (modeNom === 'nom' ? `${prenom.trim()} ${nom.trim()}` : kounia).trim();
  const nomOk = modeNom === 'nom' ? prenom.trim().length > 0 && nom.trim().length > 0 : kounia.trim().length >= 2;
  const telOk = numeroValide(telephone, pays);
  const numero = numeroComplet(telephone, pays);
  const mdpOk = motDePasse.length >= MOT_DE_PASSE_MIN;
  const w = wilayas?.find((x) => x.code === wilaya);

  const pret = inscription
    ? nomOk && !!wilaya && ville.trim().length > 0 && telOk && mdpOk && charte
    : telOk && motDePasse.length > 0;

  const valider = async () => {
    if (!pret || occupe) return;
    setOccupe(true);
    setErreur(null);
    const r =
      inscription && wilaya
        ? await auth.inscrire({ telephone: numero, nomAffiche, wilaya, ville: ville.trim(), avatar, motDePasse, langue })
        : await auth.connecter(numero, motDePasse);
    setOccupe(false);
    setErreur(r.erreur);
  };

  const changerMode = (m: Mode) => {
    setMode(m);
    setErreur(null);
  };

  return (
    <KeyboardAvoidingView style={styles.ecran} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.entete, { paddingTop: insets.top + 20 }]}>
          <View style={styles.enteteTexte}>
            <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
              {t(inscription ? 'compte.titreInscription' : 'compte.titreConnexion')}
            </Texte>
            <Texte style={styles.sousTitre}>{t(inscription ? 'compte.sousInscription' : 'compte.sousConnexion')}</Texte>
          </View>
          <BoutonLangue />
        </View>

        <View style={styles.contenu}>
          <View style={styles.onglets}>
            {(['connexion', 'inscription'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => changerMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                style={[styles.onglet, mode === m && styles.ongletActif]}
              >
                <Texte poids={600} style={styles.ongletTexte}>
                  {t(m === 'connexion' ? 'compte.ongletConnexion' : 'compte.ongletInscription')}
                </Texte>
              </Pressable>
            ))}
          </View>

          {inscription && (
            <>
              <Pressable
                onPress={() => setFeuilleImages(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.carteImage, pressed && { opacity: 0.8 }]}
              >
                <ImageProfil numero={avatar} taille={52} />
                <View style={styles.carteImageTexte}>
                  <Texte poids={700} style={{ fontSize: 14 }}>
                    {t('compte.imageProfil')}
                  </Texte>
                  <Texte style={styles.aide}>{t('compte.imageProfilSous')}</Texte>
                </View>
                <View style={{ transform: [{ rotate: rtl ? '90deg' : '-90deg' }] }}>
                  <IconeChevronBas couleur={colors.brunMoyen} />
                </View>
              </Pressable>

              <View style={styles.bloc}>
                <Libelle>{t('compte.apparaitre')}</Libelle>
                <View style={styles.deux}>
                  {(['nom', 'kounia'] as const).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setModeNom(m)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: modeNom === m }}
                      style={[styles.pastille, modeNom === m && styles.pastilleActive]}
                    >
                      <Texte poids={600} style={[styles.pastilleTexte, modeNom === m && { color: colors.sable1 }]}>
                        {t(m === 'nom' ? 'compte.modeNom' : 'compte.modeKounia')}
                      </Texte>
                    </Pressable>
                  ))}
                </View>
              </View>

              {modeNom === 'nom' ? (
                <View style={styles.deux}>
                  <Champ
                    libelle={t('compte.prenom')}
                    placeholder={t('compte.prenomEx')}
                    value={prenom}
                    onChangeText={setPrenom}
                    maxLength={30}
                    autoComplete="given-name"
                  />
                  <Champ
                    libelle={t('compte.nom')}
                    placeholder={t('compte.nomEx')}
                    value={nom}
                    onChangeText={setNom}
                    maxLength={29}
                    autoComplete="family-name"
                  />
                </View>
              ) : (
                <Champ
                  libelle={t('compte.kounia')}
                  placeholder={t('compte.kouniaEx')}
                  value={kounia}
                  onChangeText={setKounia}
                  maxLength={60}
                />
              )}

              <View style={styles.bloc}>
                <Libelle>{t('compte.wilaya')}</Libelle>
                <Pressable
                  onPress={() => setFeuilleWilayas(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.selecteur, pressed && { opacity: 0.8 }]}
                >
                  <Texte style={[styles.selecteurTexte, !w && { color: colors.brunMoyen }]} numberOfLines={1}>
                    {w ? `${numeroWilaya(w.code)} · ${langue === 'ar' ? w.nom_ar : w.nom_fr}` : t('compte.choisirWilaya')}
                  </Texte>
                  <IconeChevronBas couleur={colors.brunMoyen} />
                </Pressable>
              </View>

              <Champ
                libelle={t('compte.ville')}
                placeholder={t('compte.villeEx')}
                value={ville}
                onChangeText={setVille}
                maxLength={60}
              />
            </>
          )}

          <View style={styles.bloc}>
            <Libelle>{t('compte.telephone')}</Libelle>

            {/* Le numéro s'écrit toujours de gauche à droite, même en arabe. */}
            <View style={styles.ligneTel}>
              <Pressable
                onPress={() => setFeuillePays(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('compte.pays')} : ${t(`pays.${pays.cle}`)} +${pays.indicatif}`}
                style={({ pressed }) => [styles.indicatif, pressed && { opacity: 0.8 }]}
              >
                <Texte poids={700} style={{ fontSize: 15, writingDirection: 'ltr' }}>
                  +{pays.indicatif}
                </Texte>
                <IconeChevronBas couleur={colors.brun} taille={16} />
              </Pressable>
              <Champ
                ltr
                accessibilityLabel={t('compte.telephone')}
                placeholder={pays.exemple}
                value={telephone}
                onChangeText={(v) => setTelephone(nettoyer(v, pays))}
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={pays.longueurMax + 1}
              />
            </View>
            {inscription && telephone.length > 0 && !telOk && (
              <Texte style={styles.aide}>{t('compte.telephoneFormat')}</Texte>
            )}
            {inscription && <Texte style={styles.aide}>{t('compte.telephonePourquoi')}</Texte>}
          </View>

          <View style={styles.bloc}>
            <Champ
              ltr
              libelle={t('compte.motDePasse')}
              placeholder="••••••••"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={inscription ? 'new-password' : 'current-password'}
              onSubmitEditing={valider}
              returnKeyType="done"
            />
            {inscription && <Texte style={styles.aide}>{t('compte.motDePasseAide')}</Texte>}
          </View>

          {inscription && (
            <Pressable
              onPress={() => setCharte(!charte)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: charte }}
              style={({ pressed }) => [styles.caseCharte, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.case, charte && { backgroundColor: colors.brun }]}>
                {charte && <IconeCoche couleur={colors.sable1} taille={14} />}
              </View>
              <Texte style={styles.caseTexte}>{t('compte.accepterCharte')}</Texte>
            </Pressable>
          )}

          {erreur && (
            <Texte poids={600} style={styles.erreur} accessibilityLiveRegion="polite">
              {t(`compte.erreurs.${erreur}`)}
            </Texte>
          )}

          <Bouton
            libelle={t(inscription ? 'compte.creerCompte' : 'compte.seConnecter')}
            onPress={valider}
            actif={pret}
            occupe={occupe}
            grand
          />

          <Texte style={styles.rester}>{t('compte.resterConnecte')}</Texte>

          <Pressable onPress={() => router.push('/charte')} accessibilityRole="link" style={styles.lienCharte}>
            <Texte poids={600} style={styles.lienCharteTexte}>
              {t('compte.lireCharte')}
            </Texte>
          </Pressable>
        </View>
      </ScrollView>

      <FeuilleImagesProfil
        visible={feuilleImages}
        valeur={avatar}
        onChoisir={setAvatar}
        onFermer={() => setFeuilleImages(false)}
      />
      <FeuillePays
        visible={feuillePays}
        valeur={pays}
        onChoisir={(p) => {
          setPays(p);
          setTelephone('');
        }}
        onFermer={() => setFeuillePays(false)}
      />
      <FeuilleWilayas
        visible={feuilleWilayas}
        valeur={wilaya}
        onChoisir={setWilaya}
        onFermer={() => setFeuilleWilayas(false)}
      />
    </KeyboardAvoidingView>
  );
}

function Bouton({
  libelle,
  onPress,
  actif,
  occupe,
  sombre,
  grand,
}: {
  libelle: string;
  onPress: () => void;
  actif: boolean;
  occupe?: boolean;
  sombre?: boolean;
  grand?: boolean;
}) {
  const fond = !actif ? colors.inactif : sombre ? colors.brun : colors.accent;
  const couleur = !actif ? colors.brunMoyen : sombre ? colors.sable1 : colors.blanc;
  return (
    <Pressable
      onPress={onPress}
      disabled={!actif || occupe}
      accessibilityRole="button"
      accessibilityState={{ disabled: !actif, busy: occupe }}
      style={({ pressed }) => [styles.bouton, grand && styles.boutonGrand, { backgroundColor: fond }, pressed && { opacity: 0.8 }]}
    >
      {occupe ? (
        <ActivityIndicator color={couleur} />
      ) : (
        <Texte poids={700} style={{ color: couleur, fontSize: grand ? 19 : 14, textAlign: 'center' }}>
          {libelle}
        </Texte>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: {
    backgroundColor: colors.brun,
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  enteteTexte: { flex: 1, gap: 6 },
  titre: { fontSize: 26, color: colors.sable1 },
  sousTitre: { fontSize: 14, lineHeight: 21, color: colors.sable3 },
  contenu: { padding: 20, gap: 16 },
  onglets: { flexDirection: 'row', backgroundColor: colors.sable2, borderRadius: 12, padding: 4, gap: 4 },
  onglet: { flex: 1, height: toucheMin, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ongletActif: { backgroundColor: colors.carte },
  ongletTexte: { fontSize: 14, textAlign: 'center' },
  carteImage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
  },
  carteImageTexte: { flex: 1, gap: 2 },
  aide: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  bloc: { gap: 8 },
  deux: { flexDirection: 'row', gap: 12 },
  pastille: {
    flex: 1,
    height: toucheMin,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleActive: { backgroundColor: colors.brun, borderColor: colors.brun },
  pastilleTexte: { fontSize: 13, textAlign: 'center' },
  selecteur: { ...styleChamp, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selecteurTexte: { flex: 1, fontSize: 15 },
  ligneTel: { flexDirection: 'row', gap: 8, direction: 'ltr' },
  indicatif: {
    ...styleChamp,
    backgroundColor: colors.sable2,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caseCharte: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
  },
  case: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.brun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseTexte: { flex: 1, fontSize: 13, lineHeight: 20 },
  erreur: { fontSize: 13, lineHeight: 20, color: colors.rouge },
  bouton: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  boutonGrand: { height: 56, borderRadius: 14 },
  rester: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen, textAlign: 'center' },
  lienCharte: { minHeight: toucheMin, alignItems: 'center', justifyContent: 'center' },
  lienCharteTexte: { fontSize: 14, textDecorationLine: 'underline', textAlign: 'center' },
});
