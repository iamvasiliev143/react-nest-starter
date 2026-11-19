import type errors from '../../i18n/ru/errors.json';

export type ErrorDetails = {
  code?: string;
  requestId?: string;
  fieldErrors?: { path: string; message: string }[];
};

export class ClientError extends Error {
  readonly code?: string;
  readonly requestId?: string;
  readonly fieldErrors?: { path: string; message: string }[];

  constructor(
    readonly key: `errors:${keyof typeof errors}`,
    details: ErrorDetails = {},
  ) {
    super(key);
    this.name = 'ClientError';
    this.code = details.code;
    this.requestId = details.requestId;
    this.fieldErrors = details.fieldErrors;
  }
}
