import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class TooManyRequestsErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [429], example: 429 }) override statusCode: number = 429;
  @ApiProperty({ enum: ['RATE_LIMITED'], example: 'RATE_LIMITED' })
  override code: string = 'RATE_LIMITED';
  @ApiProperty({ example: 'Too many requests' }) override message: string =
    'Too many requests';
}
