import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresService } from '../postgres.service.js';
import { userSchema } from '../schema/index.js';

export type UserRow = typeof userSchema.$inferSelect;
export type UpsertUserInput = Pick<
  typeof userSchema.$inferInsert,
  'id' | 'firstName' | 'lastName' | 'username' | 'languageCode'
>;

@Injectable()
export class UserRepository {
  constructor(private readonly postgres: PostgresService) {}

  /** Создаёт пользователя или обновляет профиль; updated_at меняется только при изменении полей. */
  async upsert(input: UpsertUserInput): Promise<void> {
    const { id, ...fields } = input;
    await this.postgres.db
      .insert(userSchema)
      .values({ id, ...fields })
      .onConflictDoUpdate({
        target: userSchema.id,
        set: { ...fields, updatedAt: sql`now()` },
        setWhere: sql`
          (${userSchema.firstName}, ${userSchema.lastName}, ${userSchema.username}, ${userSchema.languageCode})
          IS DISTINCT FROM (excluded.first_name, excluded.last_name, excluded.username, excluded.language_code)
        `,
      });
  }

  async findId(id: string): Promise<Pick<UserRow, 'id'> | null> {
    const [user] = await this.postgres.db
      .select({ id: userSchema.id })
      .from(userSchema)
      .where(eq(userSchema.id, id))
      .limit(1);
    return user ?? null;
  }
}
