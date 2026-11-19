import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.module.js';
import { users } from '../../database/schema.js';
export type UserIdentity = { id: string };

export type UserProfile = UserIdentity & {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
};

/** Хранилище пользователей. Без DATABASE_URL работает без БД. */
@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async upsert(profile: UserProfile): Promise<void> {
    const { id, ...fields } = profile;
    await this.database.db
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
    if (!this.database.db) return { id };
    const [user] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }
}
