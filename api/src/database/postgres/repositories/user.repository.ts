import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresService } from '../postgres.service.js';
import { userSchema } from '../schema/index.js';

export type UserRow = typeof userSchema.$inferSelect;
export type UpsertUserInput = Pick<
  typeof userSchema.$inferInsert,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'username'
  | 'languageCode'
  | 'isPremium'
  | 'photoUrl'
>;

@Injectable()
export class UserRepository {
  constructor(private readonly postgres: PostgresService) {}

  /** Создаёт пользователя или обновляет профиль; updated_at меняется только при изменении полей. */
  async upsert(input: UpsertUserInput, referralCode?: string): Promise<void> {
    const { id, ...fields } = input;
    const updatedPhoto = sql`coalesce(excluded.photo_url, ${userSchema.photoUrl})`;
    await this.postgres.db
      .insert(userSchema)
      .values({
        id,
        ...fields,
        referrerId: referralCode
          ? sql`(select id from users where referral_code = ${referralCode} and id <> ${id})`
          : null,
      })
      .onConflictDoUpdate({
        target: userSchema.id,
        set: { ...fields, photoUrl: updatedPhoto, updatedAt: sql`now()` },
        setWhere: sql`
          (${userSchema.firstName}, ${userSchema.lastName}, ${userSchema.username}, ${userSchema.languageCode}, ${userSchema.isPremium}, ${userSchema.photoUrl})
          IS DISTINCT FROM (excluded.first_name, excluded.last_name, excluded.username, excluded.language_code, excluded.is_premium, ${updatedPhoto})
        `,
      });
  }

  async findIdentity(
    id: string,
  ): Promise<Pick<UserRow, 'id' | 'referralCode'> | null> {
    const [user] = await this.postgres.db
      .select({ id: userSchema.id, referralCode: userSchema.referralCode })
      .from(userSchema)
      .where(eq(userSchema.id, id))
      .limit(1);
    return user ?? null;
  }
}
