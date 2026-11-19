import { afterEach, expect, test, vi } from 'vitest';
import { getTelegramProfile, signInWithTelegram } from './api';
import { endSession, getSessionState, startSession } from './session';

vi.mock('openapi-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openapi-fetch')>();
  return {
    default: (options: Parameters<typeof actual.default>[0]) =>
      actual.default({
        baseUrl: 'http://localhost',
        fetch: (request) => globalThis.fetch(request),
        ...options,
      }),
  };
});

afterEach(() => {
  endSession();
  vi.unstubAllGlobals();
});

test('retains validation fields and request ID while translating the stable code', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          code: 'INVALID_REQUEST',
          message: 'Do not render server text',
          requestId: 'request-1',
          fieldErrors: [{ path: 'initData', message: 'Required' }],
        }),
        { status: 400 },
      ),
    ),
  );
  await expect(signInWithTelegram('bad')).rejects.toMatchObject({
    key: 'errors:invalidRequest',
    code: 'INVALID_REQUEST',
    requestId: 'request-1',
    fieldErrors: [{ path: 'initData', message: 'Required' }],
  });
});

test('expires the protected session before propagating a structured 401', async () => {
  startSession('expired-token', 60);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          requestId: 'request-2',
        }),
        { status: 401 },
      ),
    ),
  );
  await expect(getTelegramProfile()).rejects.toMatchObject({
    key: 'errors:signInRequired',
    requestId: 'request-2',
  });
  expect(getSessionState().status).toBe('expired');
});

test('handles a non-JSON proxy failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('<html>Bad gateway</html>', {
        status: 502,
        headers: { 'x-request-id': 'proxy-request' },
      }),
    ),
  );
  await expect(signInWithTelegram('data')).rejects.toMatchObject({
    key: 'errors:unknownError',
    requestId: 'proxy-request',
  });
});
