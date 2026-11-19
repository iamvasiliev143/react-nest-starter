import { ApiProperty } from '@nestjs/swagger';
export class FieldErrorDto {
  @ApiProperty({ example: 'email' }) path!: string;
  @ApiProperty({ example: 'Invalid value' }) message!: string;
}
