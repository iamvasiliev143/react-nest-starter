import type { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TelegramAuthPanel } from '../../modules/auth/TelegramAuthPanel';
import { ApiStatus } from '../../modules/health/ApiStatus';

export function HomePage({
  auth,
}: {
  auth: UseMutationResult<void, Error, string>;
}) {
  const { t } = useTranslation('health');
  return (
    <section aria-label={t('section')}>
      <ApiStatus />
      <TelegramAuthPanel auth={auth} />
    </section>
  );
}
