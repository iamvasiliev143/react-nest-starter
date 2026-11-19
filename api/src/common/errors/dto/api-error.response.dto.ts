import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number = 400;

  @ApiProperty({ example: 'HTTP_ERROR' })
  code: string = 'HTTP_ERROR';

  @ApiProperty({ example: 'Request failed' })
  message: string = 'Request failed';

  @ApiProperty({ format: 'uuid' })
  requestId!: string;
}
