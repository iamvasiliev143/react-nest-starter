import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TelegramReferralLinks {
  @ApiProperty({ format: 'uri' })
  bot!: string;

  @ApiProperty({ format: 'uri' })
  miniApp!: string;
}

export class TelegramUser {
  @ApiProperty()
  id!: string;

  @ApiProperty({ pattern: '^r[A-Za-z0-9_-]{16}$' })
  referralCode!: string;

  @ApiPropertyOptional({ type: TelegramReferralLinks })
  referralLinks?: TelegramReferralLinks;
}
