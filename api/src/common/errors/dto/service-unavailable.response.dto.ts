import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class ServiceUnavailableErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [503], example: 503 }) override statusCode: number = 503;
  @ApiProperty({
    enum: ['SERVICE_UNAVAILABLE', 'MAINTENANCE'],
    example: 'SERVICE_UNAVAILABLE',
  })
  override code: string = 'SERVICE_UNAVAILABLE';
  @ApiProperty({ example: 'Service unavailable' }) override message: string =
    'Service unavailable';
}
