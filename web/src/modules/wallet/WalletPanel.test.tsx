import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, test, vi } from 'vitest';
import { createAppI18n } from '../../i18n';
import WalletPanel from './WalletPanel';

const { provider, setOptions, useIsConnectionRestored } = vi.hoisted(() => ({
  provider: vi.fn(
    ({
      children,
    }: PropsWithChildren<{
      manifestUrl: string;
      restoreConnection: boolean;
    }>) => children,
  ),
  setOptions: vi.fn(),
  useIsConnectionRestored: vi.fn(),
}));

vi.mock('@tonconnect/ui-react', () => ({
  THEME: { DARK: 'DARK', LIGHT: 'LIGHT' },
  TonConnectButton: () => <button>TON Connect</button>,
  TonConnectUIProvider: provider,
  useTonConnectUI: () => [{}, setOptions],
  useIsConnectionRestored,
}));

afterEach(cleanup);

test('restores the previous session before showing the single TON Connect button', async () => {
  useIsConnectionRestored.mockReturnValue(false);
  const i18n = await createAppI18n('en');
  const panel = () => (
    <I18nextProvider i18n={i18n}>
      <WalletPanel manifestUrl="https://example.com/tonconnect-manifest.json" />
    </I18nextProvider>
  );
  const { rerender } = render(panel());
  expect(provider.mock.calls.at(-1)?.[0].restoreConnection).toBe(true);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Checking the wallet connection',
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();

  useIsConnectionRestored.mockReturnValue(true);
  rerender(panel());

  expect(screen.getByRole('button', { name: 'TON Connect' })).toBeEnabled();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
