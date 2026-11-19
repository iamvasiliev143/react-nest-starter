import { z } from 'zod';

export const telegramExchangeSchema = z.object({
  initData: z.string().min(1).max(8192),
});

export type TelegramExchangeRequest = z.infer<typeof telegramExchangeSchema>;
