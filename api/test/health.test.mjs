import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Storage } from '@nestjs/storage';
import { sign } from '@tma.js/init-data-node';

// Подписывает initData с повторяющимися ключами: подпись валидна, и отказ
// может дать только проверка дубликатов.
function signWithDuplicates(entries, botToken) {
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const dataCheckString = entries
    .map(([key, value]) => key + '=' + value)
    .sort()
    .join('\n');
  const hash = createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
  return new URLSearchParams([...entries, ['hash', hash]]).toString();
}

test('NodeAdapter, localization, storage and Telegram bearer auth are wired', async (t) => {
  const storagePath = await mkdtemp(join(tmpdir(), 'starter-storage-'));
  const botToken = '123456:fixture-token';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.STORAGE_PATH = storagePath;
  process.env.TELEGRAM_BOT_TOKEN = botToken;
  process.env.AUTH_TOKEN_SECRET = 'example-secret-only-used-in-tests-123';
  process.env.OBSERVE_APP_KEY = '';
  process.env.OBSERVE_APP_SECRET = '';
  let app;

  try {
    const { createApp } = await import('../dist/create-app.js');
    const { DatabaseService } =
      await import('../dist/database/database.module.js');
    const { RedisService } = await import('../dist/database/redis.module.js');
    app = await createApp();
    assert.equal(app.getHttpAdapter().getType(), 'node');
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();

    await t.test('health and localized greeting', async () => {
      const response = await fetch(base + '/api/health');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.deepEqual(await response.json(), { status: 'ok' });
      const greeting = await fetch(base + '/api/greeting', {
        headers: { 'Accept-Language': 'ru' },
      });
      assert.equal(greeting.headers.get('content-language'), 'ru');
      assert.deepEqual(await greeting.json(), { message: 'Привет' });
    });

    await t.test(
      'readiness skips optional PostgreSQL when unconfigured',
      async () => {
        const response = await fetch(base + '/api/health/ready');
        assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control'), /no-store/);
        assert.deepEqual(await response.json(), {
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });
      },
    );

    await t.test(
      'readiness reports configured PostgreSQL and liveness stays up when it fails',
      async (t) => {
        const database = app.get(DatabaseService);
        t.mock.getter(database, 'isConfigured', () => true);
        let databaseReady = true;
        const check = t.mock.method(
          database,
          'isReady',
          async () => databaseReady,
        );

        const ready = await fetch(base + '/api/health/ready');
        assert.equal(ready.status, 200);
        assert.deepEqual(await ready.json(), {
          status: 'ok',
          info: { postgres: { status: 'up' } },
          error: {},
          details: { postgres: { status: 'up' } },
        });

        databaseReady = false;
        const unavailable = await fetch(base + '/api/health/ready');
        assert.equal(unavailable.status, 503);
        assert.deepEqual(await unavailable.json(), {
          status: 'error',
          info: {},
          error: { postgres: { status: 'down' } },
          details: { postgres: { status: 'down' } },
        });
        const alive = await fetch(base + '/api/health');
        assert.equal(alive.status, 200);
        assert.deepEqual(await alive.json(), { status: 'ok' });
        assert.equal(check.mock.callCount(), 2);
      },
    );

    await t.test('readiness reports configured Redis', async (t) => {
      const redis = app.get(RedisService);
      t.mock.getter(redis, 'isConfigured', () => true);
      let redisReady = true;
      t.mock.method(redis, 'isReady', async () => redisReady);

      const ready = await fetch(base + '/api/health/ready');
      assert.equal(ready.status, 200);
      assert.deepEqual((await ready.json()).details, {
        redis: { status: 'up' },
      });

      redisReady = false;
      const unavailable = await fetch(base + '/api/health/ready');
      assert.equal(unavailable.status, 503);
      assert.deepEqual((await unavailable.json()).error, {
        redis: { status: 'down' },
      });
    });

    await t.test('storage round trip, OpenAPI and Swagger UI', async () => {
      const disk = app.get(Storage).disk();
      await disk.put('fixture.txt', Buffer.from('local'));
      assert.equal(await disk.getText('fixture.txt'), 'local');
      const spec = await fetch(base + '/api/openapi.json');
      assert.equal(spec.status, 200);
      assert.ok((await spec.json()).paths['/api/auth/telegram']);

      const docs = await fetch(base + '/api/docs');
      assert.equal(docs.status, 200);
      assert.match(await docs.text(), /swagger-ui-bundle\.js/);
      const script = await fetch(base + '/api/docs/swagger-ui-bundle.js');
      assert.equal(script.status, 200);
      assert.match(script.headers.get('content-type'), /javascript/);
      await script.arrayBuffer();
    });

    await t.test('signed Telegram exchange and protected profile', async () => {
      const send = (initData) =>
        fetch(base + '/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
      assert.equal((await fetch(base + '/api/auth/me')).status, 401);
      assert.equal((await send('invalid')).status, 401);
      const user = { id: 12345, first_name: 'Test' };
      const stale = sign({ user }, botToken, new Date(Date.now() - 360_000));
      assert.equal((await send(stale)).status, 401);
      const future = sign({ user }, botToken, new Date(Date.now() + 120_000));
      assert.equal((await send(future)).status, 401);
      const authDate = String(Math.floor(Date.now() / 1000));
      const duplicated = signWithDuplicates(
        [
          ['auth_date', authDate],
          ['user', JSON.stringify(user)],
          ['signature', ''],
          // Ключ вне схемы parse: подпись и разбор проходят, отказ даёт
          // только проверка дубликатов.
          ['extra', 'a'],
          ['extra', 'b'],
        ],
        botToken,
      );
      assert.equal((await send(duplicated)).status, 401);
      assert.equal(
        (
          await fetch(base + '/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        ).status,
        401,
      );
      const initData = sign({ user }, botToken, new Date());
      const response = await send(initData);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('set-cookie'), null);
      const { accessToken } = await response.json();
      assert.equal(typeof accessToken, 'string');
      const profile = await fetch(base + '/api/auth/me', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      assert.equal(profile.status, 200);
      assert.deepEqual(await profile.json(), { id: '12345' });
    });
  } finally {
    await app?.close();
    await rm(storagePath, { recursive: true, force: true });
  }
});
