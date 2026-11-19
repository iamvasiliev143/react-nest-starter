import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { createAppI18n } from './i18n';
import {
  getTelegramLanguage,
  initializeTelegram,
  telegramReady,
} from './telegram';
import './styles.css';

async function bootstrap() {
  initializeTelegram();

  const i18n = await createAppI18n(getTelegramLanguage());
  document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;

  const queryClient = new QueryClient();
  createRoot(document.getElementById('root')!).render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );

  telegramReady();
}

void bootstrap();
