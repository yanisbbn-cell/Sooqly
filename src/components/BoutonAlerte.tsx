import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { IconeCloche } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { cleRecherche, creerAlerte, mesAlertes } from '@/lib/alertes';
import { useAuth } from '@/lib/auth';
import type { Filtres } from '@/lib/recherche';
import { colors, toucheMin } from '@/theme';

/**
 * Accueil, pendant une recherche : « Créer une alerte pour cette recherche ».
 * Si une alerte existe déjà pour ces filtres : « Alerte active » et lien vers « Mes alertes ».
 */
export function BoutonAlerte({ filtres }: { filtres: Filtres }) {
  const { t } = useTranslation();
  const { profil } = useAuth();
  const [cles, setCles] = useState<Set<string> | null>(null);
  const [juste, setJuste] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profil) return;
      mesAlertes().then((l) => setCles(new Set(l.map((a) => cleRecherche(a.filtres)))), () => setCles(new Set()));
    }, [profil]),
  );

  const cle = cleRecherche(filtres);
  const existe = !!cles?.has(cle);

  const agir = async () => {
    setMessage(null);
    if (!profil) return router.navigate('/compte');
    if (existe) return router.push('/alertes');
    setOccupe(true);
    const r = await creerAlerte(profil.id, filtres);
    setOccupe(false);
    if (r === 'ok') {
      setCles((c) => new Set([...(c ?? []), cle]));
      setJuste(cle);
    } else setMessage(t(r === 'limite' ? 'alertes.limite' : 'alertes.erreur'));
  };

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, gap: 6 }}>
      <Pressable
        onPress={agir}
        disabled={occupe}
        accessibilityRole="button"
        style={({ pressed }) => [styles.bouton, existe && styles.actif, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.rond, existe && { backgroundColor: colors.vert }]}>
          <IconeCloche couleur={colors.blanc} taille={18} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texte poids={700} style={{ fontSize: 14, color: existe ? colors.vert : colors.brun }}>
            {existe ? (juste === cle ? t('alertes.creee') : t('alertes.active')) : t('alertes.creer')}
          </Texte>
          <Texte style={{ fontSize: 12, lineHeight: 17, color: colors.brunMoyen }}>
            {!profil ? t('alertes.connexion') : existe ? t('alertes.activeSous') : t('alertes.creerSous')}
          </Texte>
        </View>
      </Pressable>
      {message && (
        <Texte poids={600} style={{ fontSize: 12, color: colors.rouge }} accessibilityRole="alert">
          {message}
        </Texte>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: toucheMin + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.carte,
  },
  actif: { borderColor: colors.vertBord, backgroundColor: colors.vertFond },
  rond: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
