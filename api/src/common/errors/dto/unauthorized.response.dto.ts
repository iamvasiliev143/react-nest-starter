import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class UnauthorizedErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [401], example: 401 }) override statusCode: number = 401;
  @ApiProperty({ enum: ['UNAUTHORIZED'], example: 'UNAUTHORIZED' })
  override code: string = 'UNAUTHORIZED';
  @ApiProperty({ example: 'Authentication required' })
  override message: string = 'Authentication required';
}
