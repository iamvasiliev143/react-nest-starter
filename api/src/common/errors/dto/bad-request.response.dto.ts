import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
import { FieldErrorDto } from './field-error.dto.js';
export class BadRequestErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [400], example: 400 }) override statusCode: number = 400;
  @ApiProperty({ enum: ['INVALID_REQUEST'], example: 'INVALID_REQUEST' })
  override code: string = 'INVALID_REQUEST';
  @ApiProperty({ example: 'Invalid request' }) override message: string =
    'Invalid request';
  @ApiPropertyOptional({ type: [FieldErrorDto] })
  fieldErrors?: FieldErrorDto[];
}
