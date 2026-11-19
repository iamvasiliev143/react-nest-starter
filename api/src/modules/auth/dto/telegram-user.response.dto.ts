import { ApiProperty } from '@nestjs/swagger';

export class TelegramUser {
  @ApiProperty()
  id!: string;
}
