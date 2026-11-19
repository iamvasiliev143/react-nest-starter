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
const S3 = {
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://127.0.0.1:9010',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  // Бакет создаёт сервис s3-buckets из docker-compose.yml (в CI — шаг workflow).
  S3_BUCKET: 'starter-test',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || 'starter',
  S3_SECRET_ACCESS_KEY:
    process.env.S3_SECRET_ACCESS_KEY || 'starter-local-secret',
};

const TEST_DATABASE = 'starter_test';
const TEST_REDIS_DB = 1;
const MIGRATIONS = fileURLToPath(
  new URL('../../src/database/postgres/migrations', import.meta.url),
);
// Файлы тестов идут параллельными процессами: блокировка не даёт им
// одновременно создавать базу и применять миграции.
const LOCK_ID = 7_310_001;

/**
 * Готовит изолированные хранилища для тестов: `starter_test` в PostgreSQL с
 * применёнными миграциями, чистую базу Redis №1 и бакет `starter-test`.
 * Возвращает переменные окружения API.
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

    return {
      DATABASE_URL: url.href,
      REDIS_URL: redisUrl.href,
      ...S3,
    };
  } finally {
    await admin.query('select pg_advisory_unlock($1)', [LOCK_ID]);
    await admin.end();
  }
}
