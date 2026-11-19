import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresService } from '../postgres.service.js';
import { users } from '../schema/users.schema.js';

export type UserRow = typeof users.$inferSelect;
export type UpsertUserInput = Pick<
  typeof users.$inferInsert,
  'id' | 'firstName' | 'lastName' | 'username' | 'languageCode'
>;

/** Запросы к таблице users. */
@Injectable()
export class UsersRepository {
  constructor(private readonly postgres: PostgresService) {}

  /** Создаёт пользователя или обновляет профиль; updated_at меняется только при изменении полей. */
  async upsert(input: UpsertUserInput): Promise<void> {
    const { id, ...fields } = input;
    await this.postgres.db
      .insert(users)
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

  async findId(id: string): Promise<Pick<UserRow, 'id'> | null> {
    const [user] = await this.postgres.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }
}
