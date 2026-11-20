import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const userSchema = pgTable(
  'users',
  {
    id: text().primaryKey(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    username: text(),
    languageCode: text('language_code'),
    isPremium: boolean('is_premium').notNull().default(false),
    photoUrl: text('photo_url'),
    referralCode: text('referral_code')
      .notNull()
      .unique('users_referral_code_unique')
      .default(
        sql`'r' || left(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), 16)`,
      ),
    referrerId: text('referrer_id').references(
      (): AnyPgColumn => userSchema.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (user) => [
    check(
      'users_referral_code_format',
      sql`${user.referralCode} ~ '^r[A-Za-z0-9_-]{16}$'`,
    ),
    check('users_no_self_referral', sql`${user.referrerId} <> ${user.id}`),
    index('users_referrer_id_idx').on(user.referrerId),
  ],
);
