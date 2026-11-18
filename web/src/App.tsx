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
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { checkHealth, getTelegramProfile, signInWithTelegram } from './api';
import { endSession, getSessionState, subscribeToSession } from './session';
import { getTelegramInitData, showTelegramBackButton } from './telegram';

function StatusPage({
  auth,
}: {
  auth: UseMutationResult<void, Error, string>;
}) {
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
    <section aria-label="Состояние API и вход">
      <p role="status">
        {health.isFetching
          ? 'Проверяем API…'
          : health.isSuccess
            ? 'API подключён'
            : 'API недоступен'}
      </p>
      <button type="button" onClick={() => void health.refetch()}>
        Проверить API
      </button>
      {initData && (
        <div>
          {activeSession ? (
            <>
              <p role="status">
                {profile.data
                  ? 'Вход выполнен. Telegram ID ' + profile.data.id
                  : profile.isFetching
                    ? 'Загружаем профиль…'
                    : 'Профиль недоступен'}
              </p>
              {profile.isError && (
                <button type="button" onClick={() => void profile.refetch()}>
                  Повторить загрузку профиля
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  auth.reset();
                  endSession();
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              {session.status === 'expired' && (
                <p role="status">Сессия истекла.</p>
              )}
              <button
                type="button"
                disabled={auth.isPending}
                onClick={() => auth.mutate(initData)}
              >
                {session.status === 'expired'
                  ? 'Войти снова'
                  : 'Войти через Telegram'}
              </button>
              {auth.error && <p role="alert">{auth.error.message}</p>}
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
  const { register, handleSubmit } = useForm<TimezoneForm>({
    resolver: zodResolver(timezoneForm),
    defaultValues: { timezone: 'UTC' },
  });
  const [selection, setSelection] = useState<TimezoneForm>({ timezone: 'UTC' });
  const now = new TZDate(Date.now(), selection.timezone);

  return (
    <section>
      <h2>Дата и время</h2>
      <form onSubmit={handleSubmit(setSelection)}>
        <label>
          Часовой пояс
          <select {...register('timezone')}>
            <option value="UTC">UTC</option>
            <option value="Europe/Kyiv">Europe/Kyiv</option>
          </select>
        </label>
        <button type="submit">Показать время</button>
      </form>
      <p role="status">
        {format(now, 'yyyy-MM-dd HH:mm:ss XXX')} ({selection.timezone})
      </p>
    </section>
  );
}

export function App() {
  const auth = useMutation({ mutationFn: signInWithTelegram });
  return (
    <main>
      <TelegramBackButton />
      <h1>React + NestJS</h1>
      <nav aria-label="Разделы">
        <Link to="/">Состояние API</Link>
        {' · '}
        <Link to="/time">Дата и время</Link>
      </nav>
      <Routes>
        <Route index element={<StatusPage auth={auth} />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="*" element={<p>Страница не найдена.</p>} />
      </Routes>
    </main>
  );
}
