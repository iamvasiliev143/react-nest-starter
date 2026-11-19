import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresService } from '../../database/postgres/postgres.service.js';
import { users } from '../../database/postgres/schema.js';
import type { UserIdentity, UserProfile } from './interfaces/user.interface.js';

/** Хранилище пользователей. Без DATABASE_URL работает без БД. */
@Injectable()
export class UsersService {
  constructor(private readonly postgres: PostgresService) {}

  async upsert(profile: UserProfile): Promise<void> {
    const { id, ...fields } = profile;
    await this.postgres.db
      ?.insert(users)
      .values({ id, ...fields })
      .onConflictDoUpdate({
        target: users.id,
        set: { ...fields, updatedAt: sql`now()` },
        setWhere: sql`
          (${users.firstName}, ${users.lastName}, ${users.username}, ${users.languageCode})
          IS DISTINCT FROM (excluded.first_name, excluded.last_name, excluded.username, excluded.language_code)
        `,
      });
  }

  async find(id: string): Promise<UserIdentity | null> {
    if (!this.postgres.db) return { id };
    const [user] = await this.postgres.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }
}
