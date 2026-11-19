import { type UseMutationResult, useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ClientError } from '../../common/errors/client-error';
import { getTelegramInitData } from '../../common/telegram/telegram';
import { getTelegramProfile } from './api';
import { endSession, getSessionState, subscribeToSession } from './session';

export function TelegramAuthPanel({
  auth,
}: {
  auth: UseMutationResult<void, Error, string>;
}) {
  const { t } = useTranslation(['auth', 'errors']);
  const session = useSyncExternalStore(subscribeToSession, getSessionState);
  const activeSession =
    session.status === 'active' ? session.session : undefined;
  const profile = useQuery({
    queryKey: ['telegram-profile', activeSession?.id],
    queryFn: ({ signal }) => getTelegramProfile(signal),
    enabled: Boolean(activeSession),
    retry: false,
    gcTime: 0,
  });
  const initData = getTelegramInitData();

  return (
    <>
      {initData && (
        <div>
          {activeSession ? (
            <>
              <p role="status">
                {profile.data
                  ? t('auth:signedIn', { id: profile.data.id })
                  : profile.isFetching
                    ? t('auth:loadingProfile')
                    : t('auth:profileUnavailable')}
              </p>
              {profile.isError && (
                <button type="button" onClick={() => void profile.refetch()}>
                  {t('auth:retryProfile')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  auth.reset();
                  endSession();
                }}
              >
                {t('auth:signOut')}
              </button>
            </>
          ) : (
            <>
              {session.status === 'expired' && (
                <p role="status">{t('auth:expired')}</p>
              )}
              <button
                type="button"
                disabled={auth.isPending}
                onClick={() => auth.mutate(initData)}
              >
                {session.status === 'expired'
                  ? t('auth:signInAgain')
                  : t('auth:signIn')}
              </button>
              {auth.error && (
                <p role="alert">
                  {t(
                    auth.error instanceof ClientError
                      ? auth.error.key
                      : 'errors:signInFailed',
                  )}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
