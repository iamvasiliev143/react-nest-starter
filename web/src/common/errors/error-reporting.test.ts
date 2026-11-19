import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('caps reports and tolerates unavailable telemetry without leaking error details', async () => {
  vi.resetModules();
  const fetch = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetch);
  const { reportClientError } = await import('./error-reporting');
  for (let index = 0; index < 8; index += 1) {
    reportClientError(new Error('private token'), 'unhandledrejection');
  }
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/client-errors',
    expect.objectContaining({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        source: 'unhandledrejection',
        kind: 'Error',
        page: 'home',
      }),
    }),
  );
});
