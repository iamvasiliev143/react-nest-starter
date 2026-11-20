import { getTelegramInitData } from './telegram';

export async function initializeTelegramAnalytics() {
  const token = import.meta.env.VITE_TELEGRAM_ANALYTICS_TOKEN?.trim();
  const appName = import.meta.env.VITE_TELEGRAM_ANALYTICS_APP_NAME?.trim();
  if (!token || !appName || !getTelegramInitData()) return;

  const { default: analytics } = await import('@telegram-apps/analytics');
  await analytics.init({ token, appName });
}
