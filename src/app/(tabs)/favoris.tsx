import { useTranslation } from 'react-i18next';

import { EcranProvisoire } from '@/components/EcranProvisoire';

export default function Favoris() {
  const { t } = useTranslation();
  return <EcranProvisoire titre={t('ecrans.favoris.titre')} texte={t('ecrans.favoris.bientot')} />;
}
