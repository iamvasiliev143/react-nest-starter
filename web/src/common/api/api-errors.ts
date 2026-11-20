import type { Middleware } from 'openapi-fetch';
import { ClientError, type ErrorDetails } from '../errors/client-error';

const errorKeys = {
  INVALID_REQUEST: 'errors:invalidRequest',
  UNAUTHORIZED: 'errors:signInRequired',
  FORBIDDEN: 'errors:forbidden',
  NOT_FOUND: 'errors:notFound',
  RATE_LIMITED: 'errors:rateLimited',
  SERVICE_UNAVAILABLE: 'errors:apiUnavailable',
  MAINTENANCE: 'errors:apiUnavailable',
  INTERNAL_ERROR: 'errors:serverError',
  HTTP_ERROR: 'errors:unknownError',
} as const;

export const apiErrors: Middleware = {
  async onResponse({ request, response }) {
    if (response.ok) return;
    let details: ErrorDetails = {
      requestId: response.headers.get('x-request-id') ?? undefined,
    };
    try {
      const body: unknown = await response.clone().json();
      if (body && typeof body === 'object') {
        const data = body as Record<string, unknown>;
        details = {
          code: typeof data.code === 'string' ? data.code : undefined,
          requestId:
            typeof data.requestId === 'string'
              ? data.requestId
              : (response.headers.get('x-request-id') ?? undefined),
          fieldErrors: Array.isArray(data.fieldErrors)
            ? data.fieldErrors.filter(
                (entry): entry is { path: string; message: string } =>
                  entry !== null &&
                  typeof entry === 'object' &&
                  typeof entry.path === 'string' &&
                  typeof entry.message === 'string',
              )
            : undefined,
        };
      }
    } catch {
      // Proxies can return HTML or an empty response.
    }
    const code = details.code;
    const key =
      response.status === 401 &&
      new URL(request.url).pathname.endsWith('/auth/telegram')
        ? 'errors:invalidTelegramData'
        : code && Object.hasOwn(errorKeys, code)
          ? errorKeys[code as keyof typeof errorKeys]
          : 'errors:unknownError';
    throw new ClientError(key, details);
  },
};
