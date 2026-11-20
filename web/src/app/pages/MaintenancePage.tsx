import { Result } from 'antd-mobile';
import { useTranslation } from 'react-i18next';

export function MaintenancePage() {
  const { t } = useTranslation('health');
  return (
    <main>
      <Result
        status="warning"
        title={<h1>{t('maintenance')}</h1>}
        description={t('maintenanceDescription')}
      />
    </main>
  );
}
