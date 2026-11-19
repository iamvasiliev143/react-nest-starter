import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) loadEnvFile('.env');
const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/postgres/schema',
  out: './src/database/postgres/migrations',
  ...(url ? { dbCredentials: { url } } : {}),
});
