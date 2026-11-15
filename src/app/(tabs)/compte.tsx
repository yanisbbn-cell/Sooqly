import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BoutonLangue } from '@/components/BoutonLangue';
import { EcranProvisoire } from '@/components/EcranProvisoire';
import { FeuilleWilayas } from '@/components/FeuilleWilayas';
import { IconeRetour } from '@/components/Icones';
import { Texte } from '@/components/Texte';
import { usePreferences } from '@/lib/preferences';
import { numeroWilaya, useWilayas } from '@/lib/referentiel';
import { colors, toucheMin } from '@/theme';

export default function Compte() {
  const { t } = useTranslation();
  const { revoirAccueil, langue } = usePreferences();
  const [feuilleWilayas, setFeuilleWilayas] = useState(false);
  // Aperçu de l'étape 2 : la wilaya choisie sera enregistrée dans le profil à l'étape 3 (inscription).
  const [wilaya, setWilaya] = useState<number | null>(null);
  const { donnees: wilayas } = useWilayas();
  const w = wilayas?.find((x) => x.code === wilaya);

  return (
    <EcranProvisoire titre={t('ecrans.compte.titre')} texte={t('ecrans.compte.bientot')}>
      <View style={styles.menu}>
        <LigneMenu
          titre={t('ecrans.compte.charte')}
          sousTitre={t('ecrans.compte.charteSous')}
          onPress={() => router.push('/charte')}
        />
        <LigneMenu
          titre={t('ecrans.compte.wilaya')}
          sousTitre={w ? `${numeroWilaya(w.code)} · ${langue === 'ar' ? w.nom_ar : w.nom_fr}` : t('ecrans.compte.wilayaSous')}
          onPress={() => setFeuilleWilayas(true)}
        />
      </View>

      <View style={styles.ligne}>
        <View style={styles.ligneTexte}>
          <Texte poids={700} style={styles.libelle}>
            {t('langue.titre')}
          </Texte>
          <Texte style={styles.valeur}>{t('langue.actuelle')}</Texte>
        </View>
        <View style={styles.boutonLangue}>
          <BoutonLangue />
        </View>
      </View>
      <Pressable
        onPress={revoirAccueil}
        accessibilityRole="button"
        style={({ pressed }) => [styles.bouton, pressed && { opacity: 0.7 }]}
      >
        <Texte poids={700} style={styles.boutonTexte}>
          {t('ecrans.compte.revoir')}
        </Texte>
      </Pressable>

      <FeuilleWilayas
        visible={feuilleWilayas}
        valeur={wilaya}
        onChoisir={setWilaya}
        onFermer={() => setFeuilleWilayas(false)}
      />
    </EcranProvisoire>
  );
}

function LigneMenu({ titre, sousTitre, onPress }: { titre: string; sousTitre: string; onPress: () => void }) {
  const { rtl } = usePreferences();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligneMenu, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.ligneTexte}>
        <Texte poids={700} style={styles.libelle}>
          {titre}
        </Texte>
        <Texte style={styles.valeur}>{sousTitre}</Texte>
      </View>
      {/* Chevron « aller vers » : pointe vers la droite en français, vers la gauche en arabe. */}
      <View style={!rtl && { transform: [{ scaleX: -1 }] }}>
        <IconeRetour couleur={colors.brunMoyen} taille={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: { backgroundColor: colors.carte, borderRadius: 16, paddingHorizontal: 16 },
  ligneMenu: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.sable2,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.sable2,
  },
  ligneTexte: { flex: 1, gap: 2 },
  libelle: { fontSize: 15 },
  valeur: { fontSize: 13, color: colors.brunMoyen },
  boutonLangue: { backgroundColor: colors.brun, borderRadius: 12 },
  bouton: {
    minHeight: toucheMin + 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  boutonTexte: { color: colors.accentFonce, fontSize: 15, textAlign: 'center' },
});
