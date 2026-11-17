import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { EnTeteRetour } from '@/components/EnTeteRetour';
import { EtatChargement } from '@/components/EtatChargement';
import { IconeCategorie } from '@/components/IconeCategorie';
import { ImageProfil } from '@/components/ImageProfil';
import { Texte } from '@/components/Texte';
import { couleursTuile } from '@/components/annonces/tuile';
import { FeuilleNote } from '@/components/confiance/FeuilleNote';
import { photoPrincipale, type StatutAnnonce } from '@/lib/annonces';
import { useAuth } from '@/lib/auth';
import { declarerVente, oublierBadge, transactionsANoter, type TransactionANoter } from '@/lib/confiance';
import { tarifCourt } from '@/lib/location';
import {
  acheteursPossibles,
  changerStatut,
  joursRestants,
  listerMesAnnonces,
  republier,
  supprimerAnnonce,
  type AcheteurPossible,
  type MonAnnonce,
  type StatsAnnonce,
} from '@/lib/mesAnnonces';
import { urlPhoto } from '@/lib/photos';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre, lirePrix } from '@/lib/prix';
import { useCategories, useReglages } from '@/lib/referentiel';
import { colors, fonts, toucheMin, sansContourWeb } from '@/theme';

const PASTILLE: Record<StatutAnnonce, { fond: string; texte: string }> = {
  en_ligne: { fond: colors.vert, texte: colors.blanc },
  reserve: { fond: colors.accent, texte: colors.blanc },
  verification: { fond: colors.sable2, texte: colors.brun },
  vendu: { fond: '#EFE3CF', texte: colors.brunMoyen },
  loue: { fond: '#EFE3CF', texte: colors.brunMoyen },
  expire: { fond: '#FBEDEC', texte: '#7A2E29' },
  refuse: { fond: colors.rougeFond, texte: colors.rouge },
};

/** « Mes annonces » : bilan, statistiques de chaque annonce et actions (réserver, vendu, modifier, supprimer, republier). */
export default function MesAnnonces() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profil } = useAuth();
  const [annonces, setAnnonces] = useState<MonAnnonce[] | null>(null);
  const [stats, setStats] = useState<Map<string, StatsAnnonce>>(new Map());
  const [erreur, setErreur] = useState(false);
  const [aNoter, setANoter] = useState<TransactionANoter | null>(null);
  const { donnees: reglages } = useReglages();
  const tarifs = reglages?.tarifs_mise_en_avant ?? {};

  const charger = useCallback(async () => {
    if (!profil) return;
    setErreur(false);
    try {
      const r = await listerMesAnnonces(profil.id);
      setAnnonces(r.annonces);
      setStats(r.stats);
    } catch {
      setErreur(true);
    }
  }, [profil]);
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const ouvrirNote = async (annonceId: string) => {
    const liste = await transactionsANoter().catch(() => [] as TransactionANoter[]);
    setANoter(liste.find((x) => x.annonce_id === annonceId && !x.note_id) ?? null);
  };

  const compte = (statuts: StatutAnnonce[]) => String((annonces ?? []).filter((a) => statuts.includes(a.statut)).length);
  const bilan = [
    { v: compte(['en_ligne']), l: t('mesAnnonces.bilan.en_ligne') },
    { v: compte(['reserve']), l: t('mesAnnonces.bilan.reserve') },
    { v: compte(['vendu', 'loue']), l: t('mesAnnonces.bilan.vendu') },
    { v: compte(['expire']), l: t('mesAnnonces.bilan.expire') },
  ];

  return (
    <View style={styles.ecran}>
      <EnTeteRetour titre={t('mesAnnonces.titre')} />
      <FlatList
        data={annonces ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          annonces ? (
            <View style={{ gap: 12 }}>
            {annonces.some((a) => a.auteur?.est_pro) && Object.keys(tarifs).length > 0 && (
              <View style={styles.tarifs}>
                <Texte poids={700} style={{ fontSize: 14 }}>
                  {t('miseEnAvant.tarifsTitre')}
                </Texte>
                <Texte style={styles.note}>{t('miseEnAvant.tarifsTexte')}</Texte>
                {Object.entries(tarifs)
                  .sort(([x], [y]) => Number(x) - Number(y))
                  .map(([j, prix]) => (
                    <Texte key={j} poids={600} style={{ fontSize: 13 }}>
                      • {t('miseEnAvant.prix', { n: j, prix: formaterNombre(prix) })}
                    </Texte>
                  ))}
                <Texte style={styles.note}>{t('miseEnAvant.tarifsActivation')}</Texte>
              </View>
            )}
            <View style={styles.bilan}>
              {bilan.map((b) => (
                <View key={b.l} style={styles.bilanCase}>
                  <Texte variante="titre" poids={700} style={{ fontSize: 20 }}>
                    {b.v}
                  </Texte>
                  <Texte style={{ fontSize: 11, color: colors.brunMoyen, textAlign: 'center' }}>{b.l}</Texte>
                </View>
              ))}
            </View>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          annonces ? <Texte style={styles.vide}>{t('mesAnnonces.aucune')}</Texte> : <EtatChargement erreur={erreur} reessayer={charger} />
        }
        ListFooterComponent={
          annonces ? <Bouton libelle={t('mesAnnonces.nouvelle')} onPress={() => router.navigate('/publier')} variante="sombre" /> : undefined
        }
        renderItem={({ item }) => (
          <CarteMonAnnonce
            annonce={item}
            stats={stats.get(item.id)}
            onChange={charger}
            onNoter={() => ouvrirNote(item.id)}
          />
        )}
      />
      {aNoter && (
        <FeuilleNote
          transaction={aNoter}
          onFermer={() => setANoter(null)}
          onNote={() => {
            oublierBadge(aNoter.autre_id);
            setANoter(null);
            charger();
          }}
        />
      )}
    </View>
  );
}

function CarteMonAnnonce({
  annonce: a,
  stats: s,
  onChange,
  onNoter,
}: {
  annonce: MonAnnonce;
  stats: StatsAnnonce | undefined;
  onChange: () => void;
  onNoter: () => void;
}) {
  const { t } = useTranslation();
  const { rtl } = usePreferences();
  const { profil } = useAuth();
  const categories = useCategories();
  const [panneau, setPanneau] = useState<null | 'vendre' | 'supprimer' | 'republier'>(null);
  const [acheteurs, setAcheteurs] = useState<AcheteurPossible[] | null>(null);
  const [prix, setPrix] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  const categorie = categories.donnees?.find((c) => c.cle === a.categorie);
  const tuile = couleursTuile(categorie?.icone ?? 'grid');
  const location = a.type === 'location';
  const don = a.type === 'don';
  const tarif = location ? tarifCourt(a.tarifs ?? []) ?? a.tarifs?.[0] ?? null : null;
  const enCours = a.statut === 'en_ligne' || a.statut === 'reserve';
  const termine = a.statut === 'vendu' || a.statut === 'loue';
  const correction = a.statut === 'refuse' && a.correction_demandee;
  const jours = joursRestants(a.expire_le);
  const avecStats = !!s && a.statut !== 'verification' && a.statut !== 'refuse';
  const conseil = !!s && s.vues >= 60 && s.messages <= 1 && (a.statut === 'en_ligne' || a.statut === 'expire');
  const max = Math.max(1, ...(s?.vues_7 ?? [0]));
  const photo = photoPrincipale(a);
  const prixVerifiable = !don && !location;

  const agir = async (action: () => Promise<boolean>) => {
    setOccupe(true);
    setErreur(false);
    const ok = await action();
    setOccupe(false);
    if (!ok) return setErreur(true);
    setPanneau(null);
    onChange();
  };

  const ouvrirVente = async () => {
    setPanneau('vendre');
    setAcheteurs(null);
    setAcheteurs(await acheteursPossibles(a.id).catch(() => []));
  };

  const vendreA = (acheteur: AcheteurPossible | null) =>
    agir(async () => {
      if (!profil) return false;
      const r = await declarerVente(a.id, profil.id, acheteur?.id ?? null);
      if (r.id && acheteur) setTimeout(onNoter, 300);
      return !!r.id;
    });

  const nomAcheteur = s?.hors_sooqly ? t('mesAnnonces.horsSooqlyCourt') : (s?.acheteur_nom ?? '');

  return (
    <View style={styles.carte}>
      <Pressable
        onPress={() => router.push({ pathname: '/annonce/[id]', params: { id: a.id } })}
        accessibilityRole="button"
        style={styles.tete}
      >
        <View style={[styles.vignette, { backgroundColor: tuile.fond }]}>
          {photo ? (
            <Image source={{ uri: urlPhoto(photo) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <IconeCategorie icone={categorie?.icone ?? 'grid'} couleur={tuile.trait} taille={28} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Texte poids={700} style={{ fontSize: 15 }} numberOfLines={2}>
            {a.titre}
          </Texte>
          <Texte variante="titre" poids={700} style={{ fontSize: 15 }}>
            {don ? t('carte.gratuit') : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t('da')}`}
            {tarif ? ` ${t(`location.suffixe.${tarif.unite}`)}` : ''}
          </Texte>
          <View style={[styles.pastille, { backgroundColor: correction ? colors.accent : PASTILLE[a.statut].fond }]}>
            <Texte poids={700} style={{ fontSize: 11, color: correction ? colors.blanc : PASTILLE[a.statut].texte }}>
              {correction
                ? t('mesAnnonces.statut.correction')
                : a.statut === 'vendu' && location
                  ? t('mesAnnonces.statut.loue')
                  : t(`mesAnnonces.statut.${a.statut}`)}
            </Texte>
          </View>
        </View>
      </Pressable>

      {avecStats && s && (
        <View style={styles.stats}>
          <View style={styles.chiffres}>
            {[
              { v: s.vues, l: t('mesAnnonces.vue', { count: s.vues }) },
              { v: s.favoris, l: t('mesAnnonces.favoris') },
              { v: s.messages, l: t('mesAnnonces.message', { count: s.messages }) },
            ].map((c) => (
              <View key={c.l} style={{ flex: 1, alignItems: 'center' }}>
                <Texte variante="titre" poids={700} style={{ fontSize: 17 }}>
                  {formaterNombre(c.v)}
                </Texte>
                <Texte style={{ fontSize: 11, color: colors.brunMoyen }}>{c.l}</Texte>
              </View>
            ))}
          </View>
          <View
            style={{ gap: 6 }}
            accessibilityRole="image"
            accessibilityLabel={`${t('mesAnnonces.vues7')} : ${s.vues_7.reduce((x, y) => x + y, 0)}`}
          >
            <Texte style={{ fontSize: 11, color: colors.brunMoyen }}>{t('mesAnnonces.vues7')}</Texte>
            <View style={styles.graphique}>
              {s.vues_7.map((v, i) => (
                <View
                  key={i}
                  style={[styles.barre, { height: Math.max(6, Math.round((v / max) * 44)), opacity: i === 6 ? 1 : 0.75 }]}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {conseil && (
        <View style={styles.conseil}>
          <Texte style={{ fontSize: 12, lineHeight: 18, color: colors.vert }}>{t('mesAnnonces.conseil')}</Texte>
        </View>
      )}

      {enCours && jours !== null && (
        <Texte poids={jours <= 7 ? 700 : 400} style={{ fontSize: 12, color: jours <= 7 ? colors.accentFonce : colors.brunMoyen }}>
          {jours === 0 ? t('mesAnnonces.expireAujourdhui') : t('mesAnnonces.expireDans', { count: jours })}
        </Texte>
      )}
      {a.statut === 'reserve' && <Texte style={styles.note}>{t('mesAnnonces.reserveTexte')}</Texte>}
      {a.statut === 'verification' && <Texte style={styles.note}>{t('mesAnnonces.verificationNote')}</Texte>}
      {a.statut === 'refuse' && (
        <View style={{ gap: 2 }}>
          <Texte style={[styles.note, { color: correction ? colors.accentFonce : colors.rouge }]}>
            {correction ? t('mesAnnonces.correctionNote') : t('mesAnnonces.refuseeNote')}
          </Texte>
          {a.motif_refus && <Texte style={styles.note}>{t('mesAnnonces.motif', { motif: a.motif_refus })}</Texte>}
        </View>
      )}
      {termine && nomAcheteur ? (
        <Texte poids={600} style={{ fontSize: 13 }}>
          {t(location ? 'mesAnnonces.loueA' : 'mesAnnonces.venduA', { nom: nomAcheteur })}
          {s?.acheteur_id && s.note_donnee ? t('mesAnnonces.note') : ''}
        </Texte>
      ) : null}
      {termine && s?.acheteur_id && !s.note_donnee && (
        <Bouton libelle={t('mesAnnonces.noter', { nom: s.acheteur_nom ?? '' })} onPress={onNoter} variante="sombre" />
      )}

      {a.statut === 'expire' && panneau !== 'republier' && panneau !== 'supprimer' && (
        <View style={{ gap: 8 }}>
          <Texte style={styles.note}>{t('mesAnnonces.expireeTexte')}</Texte>
          <Bouton
            libelle={t('mesAnnonces.republier')}
            onPress={() => {
              if (!prixVerifiable) return agir(() => republier(a.id, null));
              setPrix(String(a.prix_da));
              setPanneau('republier');
            }}
            occupe={occupe}
          />
        </View>
      )}

      {panneau === 'republier' && (
        <View style={styles.panneau}>
          <Texte poids={700} style={{ fontSize: 13 }}>
            {t('mesAnnonces.prixActuel')}
          </Texte>
          <TextInput
            value={prix}
            onChangeText={(v) => setPrix(v.replace(/[^\d\s]/g, ''))}
            keyboardType="number-pad"
            accessibilityLabel={t('mesAnnonces.prixActuel')}
            style={[sansContourWeb, styles.champ, { fontFamily: fonts.texte[400], textAlign: rtl ? 'right' : 'left' }]}
          />
          <Bouton
            libelle={t('mesAnnonces.republier')}
            onPress={() => agir(() => republier(a.id, lirePrix(prix)))}
            actif={lirePrix(prix) !== null}
            occupe={occupe}
          />
          <Bouton libelle={t('mesAnnonces.annuler')} onPress={() => setPanneau(null)} variante="contour" />
        </View>
      )}

      {panneau === 'vendre' && (
        <View style={[styles.panneau, { borderColor: colors.accent }]}>
          <Texte poids={700} style={{ fontSize: 14 }}>
            {t(location ? 'mesAnnonces.aQuiLoue' : 'mesAnnonces.aQuiVendu')}
          </Texte>
          <Texte style={styles.note}>{t('mesAnnonces.choisirSous')}</Texte>
          {acheteurs === null ? (
            <EtatChargement erreur={false} reessayer={ouvrirVente} />
          ) : acheteurs.length === 0 ? (
            <Texte style={styles.note}>{t('mesAnnonces.personneEcrit')}</Texte>
          ) : (
            acheteurs.map((x) => (
              <Pressable key={x.id} onPress={() => vendreA(x)} disabled={occupe} accessibilityRole="button" style={styles.choix}>
                <ImageProfil numero={x.avatar} taille={32} />
                <Texte poids={700} style={{ fontSize: 14, flex: 1 }}>
                  {x.nom}
                </Texte>
              </Pressable>
            ))
          )}
          <Pressable onPress={() => vendreA(null)} disabled={occupe} accessibilityRole="button" style={styles.choix}>
            <Texte poids={600} style={{ fontSize: 14, flex: 1 }}>
              {t('mesAnnonces.horsSooqly')}
            </Texte>
          </Pressable>
          <Bouton libelle={t('mesAnnonces.annuler')} onPress={() => setPanneau(null)} variante="contour" />
        </View>
      )}

      {panneau === 'supprimer' && (
        <View style={[styles.panneau, { borderColor: colors.rouge }]}>
          <Texte poids={700} style={{ fontSize: 14 }}>
            {t('mesAnnonces.supprimerQ')}
          </Texte>
          <Texte style={styles.note}>{t('mesAnnonces.supprimerTexte')}</Texte>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Bouton libelle={t('mesAnnonces.annuler')} onPress={() => setPanneau(null)} variante="contour" />
            </View>
            <View style={{ flex: 1 }}>
              <Bouton libelle={t('mesAnnonces.supprimer')} onPress={() => agir(() => supprimerAnnonce(a.id))} variante="danger" occupe={occupe} />
            </View>
          </View>
        </View>
      )}

      {erreur && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
          {t('mesAnnonces.erreur')}
        </Texte>
      )}

      {panneau === null && (
        <View style={styles.actions}>
          {a.statut === 'en_ligne' && (
            <Action libelle={t('mesAnnonces.reserver')} onPress={() => agir(() => changerStatut(a.id, 'reserve'))} />
          )}
          {a.statut === 'reserve' && (
            <Action libelle={t('mesAnnonces.remettre')} onPress={() => agir(() => changerStatut(a.id, 'en_ligne'))} />
          )}
          {enCours && <Action libelle={t(location ? 'mesAnnonces.loue' : 'mesAnnonces.vendu')} onPress={ouvrirVente} accent />}
          {!termine && (
            <Action libelle={t('mesAnnonces.modifier')} onPress={() => router.push({ pathname: '/modifier/[id]', params: { id: a.id } })} />
          )}
          <Action libelle={t('mesAnnonces.supprimer')} onPress={() => setPanneau('supprimer')} danger />
        </View>
      )}
    </View>
  );
}

function Action({ libelle, onPress, accent, danger }: { libelle: string; onPress: () => void; accent?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        accent && { backgroundColor: colors.accent, borderColor: colors.accent },
        danger && { borderColor: colors.rouge },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Texte poids={700} style={{ fontSize: 13, color: accent ? colors.blanc : danger ? colors.rouge : colors.brun }}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  contenu: { padding: 16, gap: 14 },
  vide: { fontSize: 14, color: colors.brunMoyen, textAlign: 'center', paddingVertical: 24 },
  bilan: { flexDirection: 'row', gap: 8 },
  tarifs: { gap: 4, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.sable3 },
  bilanCase: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.carte },
  carte: { padding: 14, borderRadius: 16, backgroundColor: colors.carte, gap: 10 },
  tete: { flexDirection: 'row', gap: 12 },
  vignette: { width: 104, height: 78, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pastille: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stats: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.blanc },
  chiffres: { flexDirection: 'row' },
  graphique: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 44, direction: 'ltr' },
  barre: { flex: 1, borderRadius: 4, backgroundColor: colors.sable4 },
  conseil: { padding: 10, borderRadius: 12, backgroundColor: colors.vertFond, borderWidth: 1, borderColor: colors.vertBord },
  note: { fontSize: 12, lineHeight: 18, color: colors.brunMoyen },
  panneau: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.blanc, borderWidth: 1.5, borderColor: colors.sable3 },
  choix: {
    minHeight: toucheMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable2,
  },
  champ: {
    minHeight: toucheMin,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sable3,
    backgroundColor: colors.carte,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.brun,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    minHeight: toucheMin,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.sable4,
    justifyContent: 'center',
  },
});
