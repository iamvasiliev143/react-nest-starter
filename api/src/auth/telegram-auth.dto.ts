import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const telegramExchangeSchema = z.object({
  initData: z.string().min(1).max(8192),
});

export class TelegramToken {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  expiresIn!: number;
}

export class TelegramUser {
  @ApiProperty()
  id!: string;
}
