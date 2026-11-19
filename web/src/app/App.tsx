import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, Route, Routes } from 'react-router';
import { signInWithTelegram } from '../modules/auth/api';
import { TimePage } from '../modules/time/TimePage';
import { HomePage } from './pages/HomePage';
import { TelegramBackButton } from './TelegramBackButton';

export function App() {
  const { t } = useTranslation(['navigation', 'errors']);
  const auth = useMutation({ mutationFn: signInWithTelegram });
  return (
    <main>
      <TelegramBackButton />
      <h1>React + NestJS</h1>
      <nav aria-label={t('navigation:sections')}>
        <Link to="/">{t('navigation:api')}</Link>
        {' · '}
        <Link to="/time">{t('navigation:time')}</Link>
      </nav>
      <Routes>
        <Route index element={<HomePage auth={auth} />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="*" element={<p>{t('errors:notFound')}</p>} />
      </Routes>
    </main>
  );
}
