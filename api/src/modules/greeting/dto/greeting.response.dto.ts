import { ApiProperty } from '@nestjs/swagger';

export class Greeting {
  @ApiProperty({ example: 'Hello' })
  message!: string;
}
