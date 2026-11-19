import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const userSchema = pgTable('users', {
  id: text().primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  username: text(),
  languageCode: text('language_code'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
