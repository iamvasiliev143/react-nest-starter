import { ApiProperty } from '@nestjs/swagger';

export class TelegramToken {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  expiresIn!: number;
}
