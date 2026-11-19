import type ru from './locales/ru.json';

export class ClientError extends Error {
  constructor(readonly key: `errors.${keyof typeof ru.errors}`) {
    super(key);
    this.name = 'ClientError';
  }
}
