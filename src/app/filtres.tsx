import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FeuilleSousCategories } from '@/components/annonces/FeuilleSousCategories';
import { Bouton } from '@/components/Bouton';
import { Champ, Libelle, styleChamp } from '@/components/Champ';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeChevronBas, IconeRetour } from '@/components/Icones';
import { Pastille } from '@/components/Pastille';
import { Texte } from '@/components/Texte';
import { ETATS } from '@/lib/annonces';
import { usePreferences } from '@/lib/preferences';
import { formaterNombre, lirePrix } from '@/lib/prix';
import { FILTRES_VIDES, compterAnnonces, useRecherche, type Annonceur, type Filtres, type TypeFiltre, type ValeurCritere } from '@/lib/recherche';
import { numeroWilaya, useCategories, useWilayas, type Categorie, type Critere } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

const TYPES: TypeFiltre[] = ['tous', 'vente', 'service', 'don'];
const ANNONCEURS: Annonceur[] = ['tous', 'particuliers', 'professionnels'];
const PRESETS: { cle: 'moinsDe' | 'entre' | 'plusDe'; min: number | null; max: number | null }[] = [
  { cle: 'moinsDe', min: null, max: 10000 },
  { cle: 'entre', min: 10000, max: 50000 },
  { cle: 'plusDe', min: 50000, max: null },
];

/** Écran Filtres : on modifie un brouillon, appliqué avec « Voir N annonces ». */
export default function EcranFiltres() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { langue, rtl } = usePreferences();
  const { filtres, setFiltres } = useRecherche();
  const { donnees: categories } = useCategories();
  const { donnees: wilayas } = useWilayas();

  const [f, setF] = useState<Filtres>(filtres);
  const [nombre, setNombre] = useState<number | null>(null);
  const [feuilleCat, setFeuilleCat] = useState(false);
  const [feuilleSous, setFeuilleSous] = useState<Categorie | null>(null);
  const [feuilleWilayas, setFeuilleWilayas] = useState(false);

  const nom = (x: { nom_fr: string; nom_ar: string }) => (langue === 'ar' ? x.nom_ar : x.nom_fr);
  const cat = categories?.find((c) => c.cle === f.categorie);
  const w = wilayas?.find((x) => x.code === f.wilaya);

  // Nombre d'annonces correspondantes, recalculé à chaque changement (avec un petit délai).
  useEffect(() => {
    let actif = true;
    setNombre(null);
    const minuteur = setTimeout(() => {
      compterAnnonces(f, cat?.criteres ?? [])
        .then((n) => actif && setNombre(n))
        .catch(() => {});
    }, 300);
    return () => {
      actif = false;
      clearTimeout(minuteur);
    };
  }, [f, cat]);

  const appliquer = () => {
    setFiltres(f);
    router.back();
  };
  const changerCritere = (cle: string, v: ValeurCritere) => setF({ ...f, criteres: { ...f.criteres, [cle]: v } });
  const choisirCategorie = (c: Categorie | null) => {
    setFeuilleCat(false);
    if (!c) setF({ ...f, categorie: null, sousCategories: [], criteres: {} });
    else if (c.sous_categories.length) setFeuilleSous(c);
    else setF({ ...f, categorie: c.cle, sousCategories: [], criteres: {} });
  };
  const libelleCat = cat
    ? [nom(cat), ...cat.sous_categories.filter((s) => f.sousCategories.includes(s.id)).map(nom)].join(' › ')
    : t('filtres.toutesCategories');

  return (
    <View style={styles.ecran}>
      <View style={[styles.entete, { paddingTop: insets.top + 14 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('commun.retour')}
          style={styles.retour}
        >
          <View style={rtl && { transform: [{ scaleX: -1 }] }}>
            <IconeRetour couleur={colors.sable1} />
          </View>
        </Pressable>
        <Texte variante="titre" poids={700} style={styles.titre} accessibilityRole="header">
          {t('filtres.titre')}
        </Texte>
        <Pressable onPress={() => setF({ ...FILTRES_VIDES, texte: f.texte })} accessibilityRole="button" style={styles.reinit}>
          <Texte poids={700} style={{ fontSize: 14, color: colors.sable1, textDecorationLine: 'underline' }}>
            {t('filtres.reinitialiser')}
          </Texte>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Section titre={t('filtres.categorie')}>
          <Selecteur libelle={libelleCat} onPress={() => setFeuilleCat(!feuilleCat)} />
          {feuilleCat && (
            <View style={styles.liste}>
              <LigneSimple libelle={t('filtres.toutesCategories')} choisi={!f.categorie} onPress={() => choisirCategorie(null)} />
              {categories?.map((c) => (
                <LigneSimple key={c.cle} libelle={nom(c)} choisi={f.categorie === c.cle} onPress={() => choisirCategorie(c)} />
              ))}
            </View>
          )}
        </Section>

        <Section
          titre={cat ? t('filtres.criteresDe', { categorie: nom(cat) }) : t('filtres.criteres')}
          action={
            cat && Object.keys(f.criteres).length > 0
              ? { libelle: t('filtres.effacerCriteres'), onPress: () => setF({ ...f, criteres: {} }) }
              : undefined
          }
        >
          {!cat ? (
            <Texte style={styles.aide}>{t('filtres.choisirCategorie')}</Texte>
          ) : (
            cat.criteres.map((c) => (
              <FiltreCritere key={c.cle} critere={c} valeur={f.criteres[c.cle]} onChange={(v) => changerCritere(c.cle, v)} />
            ))
          )}
        </Section>

        <Section titre={t('filtres.wilaya')}>
          <Selecteur
            libelle={w ? `${numeroWilaya(w.code)} · ${nom(w)}` : t('filtres.toutesWilayas')}
            onPress={() => setFeuilleWilayas(true)}
          />
        </Section>

        <Section titre={t('filtres.prix')}>
          <View style={styles.rangee}>
            <Champ
              ltr
              libelle={t('filtres.minimum')}
              placeholder="0"
              keyboardType="number-pad"
              value={f.prixMin === null ? '' : formaterNombre(f.prixMin)}
              onChangeText={(v) => setF({ ...f, prixMin: lirePrix(v) })}
            />
            <Champ
              ltr
              libelle={t('filtres.maximum')}
              placeholder="—"
              keyboardType="number-pad"
              value={f.prixMax === null ? '' : formaterNombre(f.prixMax)}
              onChangeText={(v) => setF({ ...f, prixMax: lirePrix(v) })}
            />
          </View>
          <View style={styles.grille}>
            {PRESETS.map((p) => (
              <Pastille
                key={p.cle}
                libelle={t(`filtres.${p.cle}`)}
                choisi={f.prixMin === p.min && f.prixMax === p.max}
                onPress={() => setF({ ...f, prixMin: p.min, prixMax: p.max })}
              />
            ))}
          </View>
        </Section>

        <Section titre={t('filtres.type')}>
          <View style={styles.grille}>
            {TYPES.map((x) => (
              <Pastille
                key={x}
                libelle={x === 'tous' ? t('filtres.tous') : t(`publier.types.${x}`)}
                choisi={f.type === x}
                onPress={() => setF({ ...f, type: x })}
              />
            ))}
          </View>
        </Section>

        <Section titre={t('filtres.annonceur')}>
          <View style={styles.grille}>
            {ANNONCEURS.map((x) => (
              <Pastille
                key={x}
                libelle={t(x === 'tous' ? 'filtres.tous' : `filtres.${x}`)}
                choisi={f.annonceur === x}
                onPress={() => setF({ ...f, annonceur: x })}
              />
            ))}
          </View>
        </Section>

        <Section titre={t('filtres.etat')}>
          <View style={styles.grille}>
            {ETATS.map((e) => {
              const choisi = f.etats.includes(e);
              return (
                <Pastille
                  key={e}
                  libelle={(t(`etats.${e}`, { returnObjects: true }) as unknown as string[])[0]!}
                  choisi={choisi}
                  onPress={() => setF({ ...f, etats: choisi ? f.etats.filter((x) => x !== e) : [...f.etats, e] })}
                />
              );
            })}
          </View>
        </Section>
      </ScrollView>

      <View style={[styles.bas, { paddingBottom: insets.bottom + 12 }]}>
        <Bouton
          libelle={nombre === null ? t('filtres.titre') : t('filtres.voir', { count: nombre })}
          onPress={appliquer}
          occupe={nombre === null}
          grand
        />
      </View>

      <FeuilleSousCategories
        categorie={feuilleSous}
        choisies={feuilleSous && feuilleSous.cle === f.categorie ? f.sousCategories : []}
        onFermer={() => setFeuilleSous(null)}
        onValider={(ids) => {
          if (feuilleSous)
            setF({ ...f, categorie: feuilleSous.cle, sousCategories: ids, criteres: feuilleSous.cle === f.categorie ? f.criteres : {} });
          setFeuilleSous(null);
        }}
      />
      <FeuilleWilayas
        visible={feuilleWilayas}
        valeur={f.wilaya}
        onChoisir={(code) => setF({ ...f, wilaya: code })}
        onToutes={() => setF({ ...f, wilaya: null })}
        onFermer={() => setFeuilleWilayas(false)}
      />
    </View>
  );
}

function FiltreCritere({ critere, valeur, onChange }: { critere: Critere; valeur: ValeurCritere | undefined; onChange: (v: ValeurCritere) => void }) {
  const { t } = useTranslation();
  const { langue } = usePreferences();
  if (critere.type === 'choix' && critere.options) {
    const choisis = Array.isArray(valeur) ? valeur : [];
    return (
      <View style={styles.bloc}>
        <Libelle>{critere[langue]}</Libelle>
        <View style={styles.grille}>
          {critere.options.map((o) => {
            const on = choisis.includes(o.v);
            return (
              <Pastille
                key={o.v}
                libelle={o[langue]}
                choisi={on}
                onPress={() => onChange(on ? choisis.filter((x) => x !== o.v) : [...choisis, o.v])}
              />
            );
          })}
        </View>
      </View>
    );
  }
  if (critere.type === 'nombre') {
    const r = valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur : { min: null, max: null };
    const lire = (v: string) => {
      const n = v.replace(/\D/g, '');
      return n ? Number(n) : null;
    };
    return (
      <View style={styles.bloc}>
        <Libelle>{critere[langue]}</Libelle>
        <View style={styles.rangee}>
          <Champ
            ltr
            accessibilityLabel={`${critere[langue]} · ${t('filtres.minimum')}`}
            placeholder={t('filtres.minimum')}
            keyboardType="number-pad"
            value={r.min === null ? '' : String(r.min)}
            onChangeText={(v) => onChange({ ...r, min: lire(v) })}
            maxLength={9}
          />
          <Champ
            ltr
            accessibilityLabel={`${critere[langue]} · ${t('filtres.maximum')}`}
            placeholder={t('filtres.maximum')}
            keyboardType="number-pad"
            value={r.max === null ? '' : String(r.max)}
            onChangeText={(v) => onChange({ ...r, max: lire(v) })}
            maxLength={9}
          />
        </View>
      </View>
    );
  }
  return (
    <Champ
      libelle={critere[langue]}
      placeholder={t('filtres.texteLibre')}
      value={typeof valeur === 'string' ? valeur : ''}
      onChangeText={onChange}
      maxLength={40}
    />
  );
}

function Section({
  titre,
  action,
  children,
}: {
  titre: string;
  action?: { libelle: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTete}>
        <Texte variante="titre" poids={700} style={{ fontSize: 16, flex: 1 }} accessibilityRole="header">
          {titre}
        </Texte>
        {action && (
          <Pressable onPress={action.onPress} accessibilityRole="button" style={{ minHeight: toucheMin, justifyContent: 'center' }}>
            <Texte poids={700} style={{ fontSize: 13, color: colors.accentFonce, textDecorationLine: 'underline' }}>
              {action.libelle}
            </Texte>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function Selecteur({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.selecteur, pressed && { opacity: 0.8 }]}>
      <Texte style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
        {libelle}
      </Texte>
      <IconeChevronBas couleur={colors.brunMoyen} />
    </Pressable>
  );
}

function LigneSimple({ libelle, choisi, onPress }: { libelle: string; choisi: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: choisi }}
      style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.7 }]}
    >
      <Texte poids={choisi ? 700 : 400} style={{ fontSize: 15 }}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.blanc },
  entete: {
    backgroundColor: colors.brun,
    paddingBottom: 14,
    paddingStart: 12,
    paddingEnd: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retour: { width: toucheMin, height: toucheMin, alignItems: 'center', justifyContent: 'center' },
  titre: { flex: 1, fontSize: 20, color: colors.sable1 },
  reinit: { minHeight: toucheMin, justifyContent: 'center' },
  contenu: { padding: 20, gap: 22, paddingBottom: 32 },
  section: { gap: 10 },
  sectionTete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bloc: { gap: 8 },
  aide: { fontSize: 13, lineHeight: 20, color: colors.brunMoyen },
  rangee: { flexDirection: 'row', gap: 12 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selecteur: { ...styleChamp, flexDirection: 'row', alignItems: 'center', gap: 10 },
  liste: { backgroundColor: colors.carte, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.sable2 },
  ligne: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.sable2 },
  bas: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.sable2, backgroundColor: colors.blanc },
});
