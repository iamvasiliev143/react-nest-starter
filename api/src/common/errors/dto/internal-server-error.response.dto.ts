import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class InternalServerErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [500], example: 500 }) override statusCode: number = 500;
  @ApiProperty({ enum: ['INTERNAL_ERROR'], example: 'INTERNAL_ERROR' })
  override code: string = 'INTERNAL_ERROR';
  @ApiProperty({ example: 'Internal server error' }) override message: string =
    'Internal server error';
}
