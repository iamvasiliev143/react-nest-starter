import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { checkHealth } from './api';

export function ApiStatus() {
  const { t } = useTranslation(['health', 'errors']);
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: checkHealth,
    retry: false,
  });
  return (
    <>
      <p role="status">
        {health.isFetching
          ? t('health:checking')
          : health.isSuccess
            ? t('health:available')
            : t('errors:apiUnavailable')}
      </p>
      <button type="button" onClick={() => void health.refetch()}>
        {t('health:check')}
      </button>
    </>
  );
}
