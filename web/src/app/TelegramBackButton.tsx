import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { showTelegramBackButton } from '../common/telegram/telegram';

export function TelegramBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname === '/') return;
    return showTelegramBackButton(() => void navigate('/', { replace: true }));
  }, [pathname, navigate]);
  return null;
}
