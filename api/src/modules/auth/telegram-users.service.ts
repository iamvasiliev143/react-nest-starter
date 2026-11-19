import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.module.js';
import { telegramUsers } from '../../database/schema.js';

export type TelegramUserIdentity = { id: string };

/** Хранилище пользователей Telegram. Без DATABASE_URL работает без БД. */
@Injectable()
export class TelegramUsersService {
  constructor(private readonly database: DatabaseService) {}

  async ensure(id: string): Promise<void> {
    await this.database.db
      ?.insert(telegramUsers)
      .values({ id })
      .onConflictDoNothing();
  }

  async find(id: string): Promise<TelegramUserIdentity | null> {
    if (!this.database.db) return { id };
    const [user] = await this.database.db
      .select({ id: telegramUsers.id })
      .from(telegramUsers)
      .where(eq(telegramUsers.id, id))
      .limit(1);
    return user ?? null;
  }
}
