import { ApiProperty } from '@nestjs/swagger';
import { appStatusMode } from '../../../database/postgres/schema/app-status.schema.js';

export class AppStatus {
  @ApiProperty({ enum: appStatusMode.enumValues })
  mode!: (typeof appStatusMode.enumValues)[number];
}
