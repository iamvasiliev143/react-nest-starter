import { TZDate } from '@date-fns/tz';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type UseMutationResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { checkHealth, getTelegramProfile, signInWithTelegram } from './api';
import { ClientError } from './client-error';
import { endSession, getSessionState, subscribeToSession } from './session';
import { getTelegramInitData, showTelegramBackButton } from './telegram';

function StatusPage({
  auth,
}: {
  auth: UseMutationResult<void, Error, string>;
}) {
  const { t } = useTranslation();
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: checkHealth,
    retry: false,
  });
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
    <section aria-label={t('health.section')}>
      <p role="status">
        {health.isFetching
          ? t('health.checking')
          : health.isSuccess
            ? t('health.available')
            : t('errors.apiUnavailable')}
      </p>
      <button type="button" onClick={() => void health.refetch()}>
        {t('health.check')}
      </button>
      {initData && (
        <div>
          {activeSession ? (
            <>
              <p role="status">
                {profile.data
                  ? t('auth.signedIn', { id: profile.data.id })
                  : profile.isFetching
                    ? t('auth.loadingProfile')
                    : t('auth.profileUnavailable')}
              </p>
              {profile.isError && (
                <button type="button" onClick={() => void profile.refetch()}>
                  {t('auth.retryProfile')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  auth.reset();
                  endSession();
                }}
              >
                {t('auth.signOut')}
              </button>
            </>
          ) : (
            <>
              {session.status === 'expired' && (
                <p role="status">{t('auth.expired')}</p>
              )}
              <button
                type="button"
                disabled={auth.isPending}
                onClick={() => auth.mutate(initData)}
              >
                {session.status === 'expired'
                  ? t('auth.signInAgain')
                  : t('auth.signIn')}
              </button>
              {auth.error && (
                <p role="alert">
                  {t(
                    auth.error instanceof ClientError
                      ? auth.error.key
                      : 'errors.signInFailed',
                  )}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function TelegramBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname === '/') return;
    return showTelegramBackButton(() => void navigate('/', { replace: true }));
  }, [pathname, navigate]);
  return null;
}

const timezoneForm = z.object({ timezone: z.enum(['UTC', 'Europe/Kyiv']) });
type TimezoneForm = z.infer<typeof timezoneForm>;

function TimePage() {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm<TimezoneForm>({
    resolver: zodResolver(timezoneForm),
    defaultValues: { timezone: 'UTC' },
  });
  const [selection, setSelection] = useState<TimezoneForm>({ timezone: 'UTC' });
  const now = new TZDate(Date.now(), selection.timezone);

  return (
    <section>
      <h2>{t('navigation.time')}</h2>
      <form onSubmit={handleSubmit(setSelection)}>
        <label>
          {t('time.timezone')}
          <select {...register('timezone')}>
            <option value="UTC">UTC</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
          </select>
        </label>
        <button type="submit">{t('time.show')}</button>
      </form>
      <p role="status">
        {format(now, 'yyyy-MM-dd HH:mm:ss XXX')} ({selection.timezone})
      </p>
    </section>
  );
}

export function App() {
  const { t } = useTranslation();
  const auth = useMutation({ mutationFn: signInWithTelegram });
  return (
    <main>
      <TelegramBackButton />
      <h1>React + NestJS</h1>
      <nav aria-label={t('navigation.sections')}>
        <Link to="/">{t('navigation.api')}</Link>
        {' · '}
        <Link to="/time">{t('navigation.time')}</Link>
      </nav>
      <Routes>
        <Route index element={<StatusPage auth={auth} />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="*" element={<p>{t('errors.notFound')}</p>} />
      </Routes>
    </main>
  );
}
