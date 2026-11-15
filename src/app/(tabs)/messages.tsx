import { useTranslation } from 'react-i18next';

import { EcranProvisoire } from '@/components/EcranProvisoire';

export default function Messages() {
  const { t } = useTranslation();
  return <EcranProvisoire titre={t('ecrans.messages.titre')} texte={t('ecrans.messages.bientot')} />;
}
