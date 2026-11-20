import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { ErrorBoundary, RecoveryScreen } from '../common/errors/error-boundary';
import {
  installErrorReporting,
  reportClientError,
} from '../common/errors/error-reporting';
import enErrors from '../i18n/en/errors.json';
import ruErrors from '../i18n/ru/errors.json';
import { createAppI18n } from '../i18n';
import { initializeTelegramAnalytics } from '../common/telegram/analytics';
import {
  getTelegramLanguage,
  initializeTelegram,
  telegramReady,
} from '../common/telegram/telegram';
import '../styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Application root is missing');
const root = createRoot(container);
installErrorReporting();

function recoveryLabels() {
  const language = getTelegramLanguage() ?? 'ru';
  const errors = language.toLowerCase().startsWith('en') ? enErrors : ruErrors;
  return {
    title: errors.recoveryTitle,
    description: errors.recoveryDescription,
    reload: errors.reload,
  };
}

async function bootstrap() {
  initializeTelegram();
  void initializeTelegramAnalytics().catch(() => {
    console.warn('Telegram Analytics initialization failed');
  });

  const i18n = await createAppI18n(getTelegramLanguage());
  document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;

  const queryClient = new QueryClient();
  root.render(
    <ErrorBoundary labels={recoveryLabels()}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>,
  );

  telegramReady();
}

void bootstrap().catch((error: unknown) => {
  reportClientError(error, 'bootstrap');
  root.render(<RecoveryScreen labels={recoveryLabels()} />);
});
