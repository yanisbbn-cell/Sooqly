import { StyleSheet, View } from 'react-native';

import { FormulaireCompte } from '@/components/compte/FormulaireCompte';
import { TableauDeBord } from '@/components/compte/TableauDeBord';
import { EtatChargement } from '@/components/EtatChargement';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

/** Onglet Compte : connexion ou inscription, puis tableau de bord du membre. */
export default function Compte() {
  const { pret, profil } = useAuth();
  if (!pret) {
    return (
      <View style={styles.attente}>
        <EtatChargement erreur={false} reessayer={() => {}} />
      </View>
    );
  }
  return profil ? <TableauDeBord profil={profil} /> : <FormulaireCompte />;
}

const styles = StyleSheet.create({
  attente: { flex: 1, backgroundColor: colors.blanc, justifyContent: 'center' },
});
