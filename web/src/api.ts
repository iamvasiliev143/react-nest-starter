import createClient from 'openapi-fetch';
import type { paths } from './api-schema';
import { expireSession, getAccessToken, startSession } from './session';

const publicApi = createClient<paths>({ credentials: 'omit' });
const protectedApi = createClient<paths>({ credentials: 'omit' });

protectedApi.use({
  onRequest({ request }) {
    const token = getAccessToken();
    if (!token) throw new Error('Войди через Telegram, чтобы продолжить');
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
  if (data?.status !== 'ok') throw new Error('API недоступен');
  return data;
}

export async function signInWithTelegram(initData: string) {
  const { data, response } = await publicApi.POST('/api/auth/telegram', {
    body: { initData },
  });
  if (response.status === 401)
    throw new Error(
      'Не удалось подтвердить данные. Открой Mini App заново из Telegram.',
    );
  if (!data)
    throw new Error('Вход через Telegram не удался. Попробуй ещё раз.');
  startSession(data.accessToken, data.expiresIn);
}

export async function getTelegramProfile(signal?: AbortSignal) {
  const { data } = await protectedApi.GET('/api/auth/me', { signal });
  if (!data) throw new Error('Не удалось загрузить профиль');
  return data;
}
