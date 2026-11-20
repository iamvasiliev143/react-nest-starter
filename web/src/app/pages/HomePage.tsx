import type { UseMutationResult } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../common/errors/error-boundary';
import { TelegramAuthPanel } from '../../modules/auth/TelegramAuthPanel';
import { ApiStatus } from '../../modules/health/ApiStatus';
import type { useAppStatus } from '../../modules/health/useAppStatus';
import { HomeNote } from './HomeNote';

const WalletPanel = lazy(() => import('../../modules/wallet/WalletPanel'));
const manifestUrl = readManifestUrl(
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL,
);

function readManifestUrl(value: string | undefined) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {
    // The wallet panel is optional and requires a public HTTPS manifest.
  }
}

export function HomePage({
  auth,
  health,
}: {
  auth: UseMutationResult<void, Error, string>;
  health: ReturnType<typeof useAppStatus>;
}) {
  const { t } = useTranslation(['health', 'navigation']);
  return (
    <>
      <section aria-label={t('section')}>
        <ApiStatus health={health} />
        <TelegramAuthPanel auth={auth} />
      </section>
      <HomeNote />
      {manifestUrl && (
        <section aria-labelledby="wallet-title">
          <h2 id="wallet-title">{t('navigation:wallet')}</h2>
          <ErrorBoundary
            fallback={<p role="alert">{t('navigation:walletUnavailable')}</p>}
          >
            <Suspense>
              <WalletPanel manifestUrl={manifestUrl} />
            </Suspense>
          </ErrorBoundary>
        </section>
      )}
    </>
  );
}
