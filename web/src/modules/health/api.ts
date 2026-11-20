import { publicApi } from '../../common/api/client';
import { ClientError } from '../../common/errors/client-error';

export async function checkHealth(signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 4000);

  try {
    const { data } = await publicApi.GET('/api/health/app', {
      signal: controller.signal,
    });
    if (data?.mode !== 'active' && data?.mode !== 'maintenance') {
      throw new ClientError('errors:apiUnavailable');
    }
    return data;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
