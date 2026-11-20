import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  timestamp,
} from 'drizzle-orm/pg-core';

export const appStatusMode = pgEnum('app_status_mode', [
  'active',
  'maintenance',
]);

export const appStatusSchema = pgTable(
  'app_status',
  {
    singleton: boolean('singleton').primaryKey().default(true),
    mode: appStatusMode('mode').notNull().default('active'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check('app_status_singleton', sql`${table.singleton} = true`)],
);
