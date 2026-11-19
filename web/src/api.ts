import createClient from 'openapi-fetch';
import type { paths } from './api-schema';
import { ClientError } from './client-error';
import { apiErrors } from './api-errors';
import { expireSession, getAccessToken, startSession } from './session';

const publicApi = createClient<paths>({ credentials: 'omit' });
const protectedApi = createClient<paths>({ credentials: 'omit' });

publicApi.use(apiErrors);
protectedApi.use(apiErrors);

protectedApi.use({
  onRequest({ request }) {
    const token = getAccessToken();
    if (!token) throw new ClientError('errors:signInRequired');
    request.headers.set('Authorization', 'Bearer ' + token);
    return request;
  },
  onResponse({ request, response }) {
    const authorization = request.headers.get('Authorization');
    if (response.status === 401 && authorization?.startsWith('Bearer ')) {
      expireSession(authorization.slice('Bearer '.length));
    }
  },
});

export async function checkHealth() {
  const { data } = await publicApi.GET('/api/health');
  if (data?.status !== 'ok') throw new ClientError('errors:apiUnavailable');
  return data;
}

export async function signInWithTelegram(initData: string) {
  const { data, response } = await publicApi.POST('/api/v1/auth/telegram', {
    body: { initData },
  });
  if (response.status === 401)
    throw new ClientError('errors:invalidTelegramData');
  if (!data) throw new ClientError('errors:signInFailed');
  startSession(data.accessToken, data.expiresIn);
}

export async function getTelegramProfile(signal?: AbortSignal) {
  const { data } = await protectedApi.GET('/api/v1/auth/me', { signal });
  if (!data) throw new ClientError('errors:profileLoadFailed');
  return data;
}
