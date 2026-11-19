import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error.response.dto.js';
export class ForbiddenErrorResponseDto extends ApiErrorResponseDto {
  @ApiProperty({ enum: [403], example: 403 }) override statusCode: number = 403;
  @ApiProperty({ enum: ['FORBIDDEN'], example: 'FORBIDDEN' })
  override code: string = 'FORBIDDEN';
  @ApiProperty({ example: 'Access denied' }) override message: string =
    'Access denied';
}
