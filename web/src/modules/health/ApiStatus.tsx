import { useTranslation } from 'react-i18next';
import type { useAppStatus } from './useAppStatus';

export function ApiStatus({
  health,
}: {
  health: ReturnType<typeof useAppStatus>;
}) {
  const { t } = useTranslation(['health', 'errors']);
  return (
    <>
      <p role="status">
        {health.isPending
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
