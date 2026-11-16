import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Bouton } from '@/components/Bouton';
import { Texte } from '@/components/Texte';

import { Feuille } from './Feuille';

type Props = {
  visible: boolean;
  titre: string;
  texte: string;
  libelle: string;
  danger?: boolean;
  onConfirmer: () => Promise<void> | void;
  onFermer: () => void;
};

/** Demande de confirmation (bloquer, déclarer une vente…). */
export function FeuilleConfirmation({ visible, titre, texte, libelle, danger, onConfirmer, onFermer }: Props) {
  const { t } = useTranslation();
  const [occupe, setOccupe] = useState(false);
  const confirmer = async () => {
    setOccupe(true);
    await onConfirmer();
    setOccupe(false);
  };
  return (
    <Feuille visible={visible} onFermer={onFermer} titre={titre}>
      <Texte variante="titre" poids={700} style={{ fontSize: 20 }} accessibilityRole="header">
        {titre}
      </Texte>
      <Texte style={{ fontSize: 14, lineHeight: 21 }}>{texte}</Texte>
      <Bouton libelle={libelle} onPress={confirmer} occupe={occupe} variante={danger ? 'danger' : 'accent'} />
      <Bouton libelle={t('confiance.annuler')} onPress={onFermer} variante="contour" />
    </Feuille>
  );
}
