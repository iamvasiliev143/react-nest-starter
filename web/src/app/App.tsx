import { useMutation } from '@tanstack/react-query';
import { Result, TabBar } from 'antd-mobile';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { getTelegramInitData } from '../common/telegram/telegram';
import { signInWithTelegram } from '../modules/auth/api';
import { useAppStatus } from '../modules/health/useAppStatus';
import { TimePage } from '../modules/time/TimePage';
import { HomePage } from './pages/HomePage';
import { MaintenancePage } from './pages/MaintenancePage';
import { TelegramBackButton } from './TelegramBackButton';

export function App() {
  const { t } = useTranslation(['navigation', 'errors', 'health']);
  const health = useAppStatus();
  const canEnter = health.isSuccess && health.data.mode === 'active';
  const auth = useMutation({ mutationFn: signInWithTelegram, retry: false });
  const { mutate: signIn } = auth;
  const attemptedSignIn = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const initData = getTelegramInitData();
    if (!canEnter || !initData || attemptedSignIn.current) return;
    attemptedSignIn.current = true;
    signIn(initData);
  }, [canEnter, signIn]);

  if (health.isSuccess && health.data.mode === 'maintenance') {
    return <MaintenancePage />;
  }

  if (!canEnter) {
    return (
      <main>
        <Result
          status={health.isPending ? 'waiting' : 'error'}
          title={
            <h1>
              {health.isPending
                ? t('health:checking')
                : t('errors:apiUnavailable')}
            </h1>
          }
        />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <main>
        <TelegramBackButton />
        <h1>React + NestJS</h1>
        <Routes>
          <Route index element={<HomePage auth={auth} health={health} />} />
          <Route path="/time" element={<TimePage />} />
          <Route path="*" element={<p>{t('errors:notFound')}</p>} />
        </Routes>
      </main>
      <nav className="app-tabs" aria-label={t('navigation:sections')}>
        <TabBar activeKey={pathname}>
          <TabBar.Item
            key="/"
            title={
              <NavLink to="/" end>
                {t('navigation:api')}
              </NavLink>
            }
          />
          <TabBar.Item
            key="/time"
            title={<NavLink to="/time">{t('navigation:time')}</NavLink>}
          />
        </TabBar>
      </nav>
    </div>
  );
}
