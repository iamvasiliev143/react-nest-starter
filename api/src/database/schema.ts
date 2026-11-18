import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const telegramUsers = pgTable('telegram_users', {
  id: text().primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
