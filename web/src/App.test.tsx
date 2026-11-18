import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from './App';

test('selects and displays a timezone', async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/time']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Часовой пояс' }),
    'Europe/Kyiv',
  );
  await user.click(screen.getByRole('button', { name: 'Показать время' }));
  expect(screen.getByRole('status')).toHaveTextContent('Europe/Kyiv');
});
