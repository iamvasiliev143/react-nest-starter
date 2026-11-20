import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ErrorBoundary } from './error-boundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('shows recovery after a rendering failure and reports only fixed categories', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): never {
    throw new TypeError('SECRET initData=user-private-data');
  }
  render(
    <ErrorBoundary
      labels={{
        title: 'Failed',
        description: 'Try reloading',
        reload: 'Reload',
      }}
    >
      <Broken />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Try reloading');
  expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
  expect(screen.queryByText(/SECRET/)).toBeNull();
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/client-errors',
    expect.objectContaining({
      credentials: 'omit',
      body: JSON.stringify({
        source: 'render',
        kind: 'TypeError',
        page: 'home',
      }),
    }),
  );
});

test('recovers when initial localization fails', async () => {
  vi.resetModules();
  vi.doMock('../../i18n', () => ({
    createAppI18n: vi
      .fn()
      .mockRejectedValue(new Error('private initialization details')),
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  const root = document.createElement('div');
  root.id = 'root';
  document.body.append(root);
  await import('../../app/bootstrap');
  expect(
    await screen.findByRole('heading', {
      name: 'Не удалось загрузить приложение',
    }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Перезагрузить' })).toBeVisible();
  root.remove();
  vi.doUnmock('../../i18n');
});
