import { useTranslation } from 'react-i18next';

import { EcranProvisoire } from '@/components/EcranProvisoire';

export default function Annonces() {
  const { t } = useTranslation();
  return <EcranProvisoire titre={t('ecrans.annonces.titre')} texte={t('ecrans.annonces.bientot')} />;
}
