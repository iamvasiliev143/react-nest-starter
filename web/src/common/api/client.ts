import createClient from 'openapi-fetch';
import type { paths } from '../../api-schema';
import { apiErrors } from './api-errors';

export const publicApi = createClient<paths>({ credentials: 'omit' });
publicApi.use(apiErrors);
