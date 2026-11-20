import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from './App';
import { createAppI18n } from '../i18n';

test('selects and displays a timezone', async () => {
  const user = userEvent.setup();
  const i18n = await createAppI18n();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  queryClient.setQueryData(['app-status'], { mode: 'active' });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/time']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Часовой пояс' }),
    'Europe/Kyiv',
  );
  await user.click(screen.getByRole('button', { name: 'Показать время' }));
  expect(screen.getByRole('status')).toHaveTextContent('Europe/Kyiv');
});
