import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import { Storage } from '@nestjs/storage';
import { sign } from '@tma.js/init-data-node';
import { prepareTestServices } from './support/environment.mjs';

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
  const botToken = '123456:fixture-token';
  process.env.NODE_ENV = 'test';
  Object.assign(process.env, await prepareTestServices());
  process.env.TELEGRAM_BOT_TOKEN = botToken;
  process.env.AUTH_TOKEN_SECRET = 'example-secret-only-used-in-tests-123';
  process.env.OBSERVE_APP_KEY = '';
  process.env.OBSERVE_APP_SECRET = '';
  let app;

  try {
    const { createApp } = await import('../dist/create-app.js');
    const { PostgresService } =
      await import('../dist/database/postgres/postgres.service.js');
    const { RedisService } =
      await import('../dist/database/redis/redis.service.js');
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
      const v1 = await fetch(base + '/api/v1/greeting', {
        headers: { 'Accept-Language': 'ru' },
      });
      assert.equal(v1.status, 200);
      assert.deepEqual(await v1.json(), { message: 'Привет' });
      assert.equal((await fetch(base + '/api/v1/health')).status, 404);
    });

    const allUp = {
      postgres: { status: 'up' },
      redis: { status: 'up' },
      s3: { status: 'up' },
    };

    await t.test('readiness checks PostgreSQL, Redis and S3', async () => {
      const response = await fetch(base + '/api/health/ready');
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.deepEqual(await response.json(), {
        status: 'ok',
        info: allUp,
        error: {},
        details: allUp,
      });
    });

    await t.test(
      'readiness reports PostgreSQL down and liveness stays up',
      async (t) => {
        const { db } = app.get(PostgresService);
        const execute = t.mock.method(db, 'execute', async () => {
          throw new Error('connection refused');
        });

        const unavailable = await fetch(base + '/api/health/ready');
        assert.equal(unavailable.status, 503);
        assert.deepEqual(await unavailable.json(), {
          status: 'error',
          info: { redis: { status: 'up' }, s3: { status: 'up' } },
          error: { postgres: { status: 'down' } },
          details: { ...allUp, postgres: { status: 'down' } },
        });
        const alive = await fetch(base + '/api/health');
        assert.equal(alive.status, 200);
        assert.deepEqual(await alive.json(), { status: 'ok' });
        assert.equal(execute.mock.callCount(), 1);
      },
    );

    await t.test(
      'Redis throttler shares counts and blocks across instances',
      async (t) => {
        const { RedisThrottlerStorage } =
          await import('../dist/common/throttler/redis-throttler.storage.js');
        const { client } = app.get(RedisService);
        // Other test processes may flush DB 1 while preparing their app.
        const redis = client.duplicate({ db: 2 });
        const key = randomUUID();
        const throttler = 'shared-limit-test';
        const prefix = `throttler:${throttler}:${key}`;
        t.after(async () => {
          try {
            await redis.del(`${prefix}:hits`, `${prefix}:block`);
          } finally {
            redis.disconnect();
          }
        });
        await redis.ping();

        // Both old members used the same wall time, PID and initial sequence.
        t.mock.method(Date, 'now', () => 1_700_000_000_000);
        const first = new RedisThrottlerStorage(redis);
        const second = new RedisThrottlerStorage(redis);
        const hit = (storage) =>
          storage.increment(key, 30_000, 2, 60_000, throttler);

        const initial = await hit(first);
        assert.equal(initial.totalHits, 1);
        assert.equal(initial.isBlocked, false);

        const shared = await hit(second);
        assert.equal(shared.totalHits, 2);
        assert.equal(shared.isBlocked, false);

        const overLimit = await hit(first);
        assert.equal(overLimit.totalHits, 3);
        assert.equal(overLimit.isBlocked, true);

        const blocked = await hit(second);
        assert.equal(blocked.totalHits, 3);
        assert.equal(blocked.isBlocked, true);
      },
    );

    await t.test('readiness reports Redis down', async (t) => {
      const { client } = app.get(RedisService);
      t.mock.method(client, 'ping', async () => {
        throw new Error('connection refused');
      });

      const unavailable = await fetch(base + '/api/health/ready');
      assert.equal(unavailable.status, 503);
      assert.deepEqual((await unavailable.json()).error, {
        redis: { status: 'down' },
      });
    });

    await t.test('readiness reports S3 down', async (t) => {
      t.mock.method(app.get(Storage).disk(), 'list', async () => {
        throw new Error('connection refused');
      });

      const unavailable = await fetch(base + '/api/health/ready');
      assert.equal(unavailable.status, 503);
      assert.deepEqual((await unavailable.json()).error, {
        s3: { status: 'down' },
      });
    });

    await t.test('S3 round trip, OpenAPI and Swagger UI', async () => {
      const disk = app.get(Storage).disk();
      const key = `fixtures/${Date.now()}-${process.pid}.txt`;
      await disk.put(key, Buffer.from('s3'));
      assert.equal(await disk.getText(key), 's3');
      await disk.delete(key);
      assert.equal(await disk.exists(key), false);
      const spec = await fetch(base + '/api/openapi.json');
      assert.equal(spec.status, 200);
      const { paths } = await spec.json();
      assert.ok(paths['/api/auth/telegram']);
      assert.ok(paths['/api/v1/auth/telegram']);
      assert.equal(
        paths['/api/greeting'].get.operationId,
        'StatusController_greeting',
      );
      const operationIds = Object.values(paths).flatMap((item) =>
        Object.values(item).map((operation) => operation.operationId),
      );
      assert.equal(new Set(operationIds).size, operationIds.length);

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
  }
});
