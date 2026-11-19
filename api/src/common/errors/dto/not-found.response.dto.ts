import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class NotFoundErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [404], example: 404 }) override statusCode: number = 404;
  @ApiProperty({ enum: ['NOT_FOUND'], example: 'NOT_FOUND' })
  override code: string = 'NOT_FOUND';
  @ApiProperty({ example: 'Resource not found' }) override message: string =
    'Resource not found';
}
