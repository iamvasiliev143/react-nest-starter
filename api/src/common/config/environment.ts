import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const schema = z
  .object({
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    S3_ENDPOINT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url({ protocol: /^https?$/ }).optional(),
    ),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_BUCKET: z.string().min(3),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    OBSERVE_APP_KEY: optionalText,
    OBSERVE_APP_SECRET: optionalText,
    TELEGRAM_BOT_TOKEN: optionalText,
    AUTH_TOKEN_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32).optional(),
    ),
  })
  .superRefine((env, context) => {
    if (Boolean(env.OBSERVE_APP_KEY) !== Boolean(env.OBSERVE_APP_SECRET)) {
      context.addIssue({
        code: 'custom',
        path: ['OBSERVE_APP_KEY'],
        message: 'Configure both Observe credentials.',
      });
    }
    if (Boolean(env.TELEGRAM_BOT_TOKEN) !== Boolean(env.AUTH_TOKEN_SECRET)) {
      context.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_TOKEN'],
        message: 'Configure both the bot token and the access-token secret.',
      });
    }
  });

export type Environment = z.infer<typeof schema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((issue) => issue.path.join('.') + ': ' + issue.message)
        .join('\n'),
    );
  }
  return result.data;
}
