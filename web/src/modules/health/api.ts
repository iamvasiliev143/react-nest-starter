import { publicApi } from '../../common/api/client';
import { ClientError } from '../../common/errors/client-error';

export async function checkHealth() {
  const { data } = await publicApi.GET('/api/health');
  if (data?.status !== 'ok') throw new ClientError('errors:apiUnavailable');
  return data;
}
