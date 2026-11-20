import { Injectable } from '@nestjs/common';
import { PostgresService } from '../postgres.service.js';
import { appStatusSchema } from '../schema/app-status.schema.js';

@Injectable()
export class AppStatusRepository {
  constructor(private readonly postgres: PostgresService) {}

  async read() {
    const [row] = await this.postgres.db
      .select({
        mode: appStatusSchema.mode,
      })
      .from(appStatusSchema)
      .limit(1);
    return row;
  }
}
