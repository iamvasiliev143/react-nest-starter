import type errors from './i18n/ru/errors.json';

export class ClientError extends Error {
  constructor(readonly key: `errors:${keyof typeof errors}`) {
    super(key);
    this.name = 'ClientError';
  }
}
