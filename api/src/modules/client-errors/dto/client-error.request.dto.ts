import { z } from 'zod';
export const clientErrorSchema = z
  .object({
    source: z.enum(['render', 'bootstrap', 'window', 'unhandledrejection']),
    kind: z.enum([
      'Error',
      'TypeError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'UnknownError',
    ]),
    page: z.enum(['home', 'time', 'other']),
  })
  .strict();
export type ClientErrorRequest = z.infer<typeof clientErrorSchema>;
