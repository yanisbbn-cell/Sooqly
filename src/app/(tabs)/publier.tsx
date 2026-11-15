import { useTranslation } from 'react-i18next';

import { EcranProvisoire } from '@/components/EcranProvisoire';

export default function Publier() {
  const { t } = useTranslation();
  return <EcranProvisoire titre={t('ecrans.publier.titre')} texte={t('ecrans.publier.bientot')} />;
}
