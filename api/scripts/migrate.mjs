// Применяет существующие миграции Drizzle с runtime-зависимостями.
// Запуск: npm run migrate -w api
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (!process.env.DATABASE_URL && existsSync(envFile)) loadEnvFile(envFile);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const migrationsFolder = fileURLToPath(
  new URL('../src/database/postgres/migrations', import.meta.url),
);
// Несколько экземпляров могут стартовать одновременно: блокировка
// гарантирует, что миграции применит только один из них.
const LOCK_ID = 7_310_000;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('select pg_advisory_lock($1)', [LOCK_ID]);
  await migrate(drizzle(client), { migrationsFolder });
  console.log('Migrations applied');
} finally {
  await client
    .query('select pg_advisory_unlock($1)', [LOCK_ID])
    .catch(() => {});
  await client.end();
}
