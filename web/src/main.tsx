import { readTelegramInitData } from './common/telegram/telegram';

async function start() {
  if (readTelegramInitData()) {
    try {
      await import('./app/bootstrap');
      return;
    } catch {
      const { showLaunchError } = await import('./app/launch-error');
      showLaunchError('Не удалось загрузить приложение');
      return;
    }
  }

  const { showLaunchError } = await import('./app/launch-error');
  showLaunchError(
    'Не удалось войти',
    'Откройте приложение из Telegram, чтобы войти.',
  );
}

void start();
