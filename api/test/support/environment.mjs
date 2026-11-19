import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Redis } from 'ioredis';
import pg from 'pg';

// Сервисы из docker-compose.yml. В CI адреса задаются переменными окружения.
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://starter:starter-local@127.0.0.1:5434/starter';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6380';

const TEST_DATABASE = 'starter_test';
const TEST_REDIS_DB = 1;
const MIGRATIONS = fileURLToPath(
  new URL('../../src/database/postgres/migrations', import.meta.url),
);
// Файлы тестов идут параллельными процессами: блокировка не даёт им
// одновременно создавать базу и применять миграции.
const LOCK_ID = 7_310_001;

/**
 * Готовит изолированные базы для тестов: `starter_test` в PostgreSQL с
 * применёнными миграциями и чистую базу Redis №1. Возвращает их адреса.
 */
export async function prepareTestServices() {
  const admin = new pg.Client({ connectionString: DATABASE_URL });
  await admin.connect();
  try {
    await admin.query('select pg_advisory_lock($1)', [LOCK_ID]);
    const { rowCount } = await admin.query(
      'select 1 from pg_database where datname = $1',
      [TEST_DATABASE],
    );
    if (!rowCount) await admin.query(`create database ${TEST_DATABASE}`);

    const url = new URL(DATABASE_URL);
    url.pathname = '/' + TEST_DATABASE;
    const pool = new pg.Pool({ connectionString: url.href });
    try {
      await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS });
    } finally {
      await pool.end();
    }

    const redisUrl = new URL(REDIS_URL);
    redisUrl.pathname = '/' + TEST_REDIS_DB;
    const redis = new Redis(redisUrl.href);
    try {
      await redis.flushdb();
    } finally {
      redis.disconnect();
    }

    return { databaseUrl: url.href, redisUrl: redisUrl.href };
  } finally {
    await admin.query('select pg_advisory_unlock($1)', [LOCK_ID]);
    await admin.end();
  }
}
