import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { Storage } from '@nestjs/storage';
import { sign } from '@tma.js/init-data-node';
import { eq } from 'drizzle-orm';
import { Bot } from 'grammy';
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
  process.env.TELEGRAM_BOT_USERNAME = 'fixture_bot';
  process.env.TELEGRAM_MINI_APP_SHORT_NAME = 'play';
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

    await t.test(
      'client reports are public, validated, correlated and rate limited',
      async () => {
        const send = (body) =>
          fetch(base + '/api/v1/client-errors', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Id': 'untrusted',
            },
            body: JSON.stringify(body),
          });
        const invalid = await send({
          source: 'render',
          kind: 'Error',
          page: 'home',
          message: 'private',
        });
        assert.equal(invalid.status, 400);
        const error = await invalid.json();
        assert.equal(error.code, 'INVALID_REQUEST');
        assert.equal(error.requestId, invalid.headers.get('x-request-id'));
        assert.notEqual(error.requestId, 'untrusted');
        assert.ok(Array.isArray(error.fieldErrors));
        const body = { source: 'render', kind: 'Error', page: 'home' };
        const ok = await send(body);
        assert.equal(ok.status, 204);
        assert.equal(await ok.text(), '');
        for (let i = 0; i < 8; i++)
          assert.equal((await send(body)).status, 204);
        const limited = await send(body);
        assert.equal(limited.status, 429);
        assert.equal((await limited.json()).code, 'RATE_LIMITED');
      },
    );

    await t.test('health and localized greeting', async () => {
      const response = await fetch(base + '/api/health');
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.deepEqual(await response.json(), { status: 'ok' });
      const greeting = await fetch(base + '/api/v1/greeting', {
        headers: { 'Accept-Language': 'ru' },
      });
      assert.equal(greeting.headers.get('content-language'), 'ru');
      assert.deepEqual(await greeting.json(), { message: 'Привет' });
      assert.equal((await fetch(base + '/api/greeting')).status, 404);
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
        const { code, message, requestId, statusCode, ...health } =
          await unavailable.json();
        assert.equal(statusCode, 503);
        assert.equal(code, 'SERVICE_UNAVAILABLE');
        assert.equal(message, 'Service unavailable');
        assert.equal(requestId, unavailable.headers.get('x-request-id'));
        assert.deepEqual(health, {
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
      assert.equal(paths['/api/auth/telegram'], undefined);
      assert.ok(paths['/api/v1/auth/telegram']);
      assert.equal(
        paths['/api/v1/greeting'].get.operationId,
        'GreetingController_greeting_v1',
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
        fetch(base + '/api/v1/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
      assert.equal((await fetch(base + '/api/v1/auth/me')).status, 401);
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
          await fetch(base + '/api/v1/auth/telegram', {
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
      const profile = await fetch(base + '/api/v1/auth/me', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      assert.equal(profile.status, 200);
      const account = await profile.json();
      assert.match(account.referralCode, /^r[A-Za-z0-9_-]{16}$/);
      assert.deepEqual(account, {
        id: '12345',
        referralCode: account.referralCode,
        referralLinks: {
          bot: 'https://t.me/fixture_bot?start=ref_' + account.referralCode,
          miniApp:
            'https://t.me/fixture_bot/play?startapp=ref_' +
            account.referralCode,
        },
      });
    });

    await t.test(
      'registers and attributes first Telegram contacts through both entry points',
      async () => {
        const { registerTelegramStart } =
          await import('../dist/modules/telegram-bot/telegram-start.js');
        const { UsersService } =
          await import('../dist/modules/users/users.service.js');
        const { userSchema } =
          await import('../dist/database/postgres/schema/user.schema.js');
        const bot = new Bot(botToken, {
          botInfo: {
            id: 123456,
            is_bot: true,
            first_name: 'Fixture',
            username: 'fixture_bot',
          },
        });
        registerTelegramStart(bot, app.get(UsersService));
        const baseId = Number(
          '7' +
            randomUUID()
              .replace(/[^0-9]/g, '')
              .slice(0, 11)
              .padEnd(11, '0'),
        );
        const [
          inviter,
          otherInviter,
          chatUser,
          appUser,
          selfRef,
          unknownRef,
          racingUser,
          legacyRef,
        ] = Array.from({ length: 8 }, (_, offset) => baseId + offset);
        const start = (id, payload = '', user = {}) =>
          bot.handleUpdate({
            update_id: 1,
            message: {
              message_id: 1,
              date: Math.floor(Date.now() / 1000),
              chat: { id, type: 'private', first_name: 'Fixture' },
              from: { id, is_bot: false, first_name: 'Fixture', ...user },
              text: payload ? '/start ' + payload : '/start',
              entities: [{ type: 'bot_command', offset: 0, length: 6 }],
            },
          });
        const getUser = async (id) => {
          const [row] = await app
            .get(PostgresService)
            .db.select()
            .from(userSchema)
            .where(eq(userSchema.id, String(id)));
          return row;
        };

        await Promise.all([
          start(inviter),
          start(otherInviter),
          start(selfRef),
          start(unknownRef, 'ref_r0000000000000000'),
        ]);
        const inviterRow = await getUser(inviter);
        const otherInviterRow = await getUser(otherInviter);
        const invite = 'ref_' + inviterRow.referralCode;
        const otherInvite = 'ref_' + otherInviterRow.referralCode;
        assert.equal(inviterRow.referrerId, null);
        assert.match(inviterRow.referralCode, /^r[A-Za-z0-9_-]{16}$/);
        assert.notEqual(inviterRow.referralCode, otherInviterRow.referralCode);
        const self = await getUser(selfRef);
        await start(selfRef, 'ref_' + self.referralCode);
        assert.equal((await getUser(selfRef)).referrerId, null);
        assert.equal((await getUser(unknownRef)).referrerId, null);
        await start(legacyRef, 'ref_' + inviter);
        assert.equal((await getUser(legacyRef)).referrerId, null);
        await start(selfRef, invite);
        assert.equal((await getUser(selfRef)).referrerId, null);
        await start(chatUser, invite);
        assert.equal((await getUser(chatUser)).referrerId, String(inviter));
        await Promise.all([
          start(racingUser, invite),
          start(racingUser, otherInvite),
        ]);
        const racingReferrer = (await getUser(racingUser)).referrerId;
        assert.ok(
          [String(inviter), String(otherInviter)].includes(racingReferrer),
        );
        await Promise.all([
          start(racingUser, otherInvite),
          start(racingUser, invite),
        ]);
        assert.equal((await getUser(racingUser)).referrerId, racingReferrer);

        const photoUrl = 'https://t.me/i/userpic/320/fixture.svg';
        const user = {
          id: appUser,
          first_name: 'Mini App',
          is_premium: true,
          photo_url: photoUrl,
        };
        const exchange = (initData) =>
          fetch(base + '/api/v1/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
        const signed = sign(
          { user, start_param: invite },
          botToken,
          new Date(),
        );
        const tampered = new URLSearchParams(signed);
        tampered.set('start_param', otherInvite);
        assert.equal((await exchange(tampered.toString())).status, 401);
        assert.equal(await getUser(appUser), undefined);
        assert.equal((await exchange(signed)).status, 200);
        const first = await getUser(appUser);
        assert.equal(first.referrerId, String(inviter));
        assert.match(first.referralCode, /^r[A-Za-z0-9_-]{16}$/);
        assert.equal(first.isPremium, true);
        assert.equal(first.photoUrl, photoUrl);

        await start(appUser, otherInvite, { first_name: 'Updated' });
        const updated = await getUser(appUser);
        assert.equal(updated.firstName, 'Updated');
        assert.equal(updated.isPremium, false);
        assert.equal(updated.photoUrl, photoUrl);
        assert.equal(updated.referrerId, String(inviter));
        assert.equal(updated.referralCode, first.referralCode);
      },
    );

    await t.test(
      'maintenance gates HTTP and shares one status lookup per replica',
      async (t) => {
        const { AppStatusRepository } =
          await import('../dist/database/postgres/repositories/app-status.repository.js');
        const endpoint = base + '/api/health/app';
        const active = await fetch(endpoint);
        assert.equal(active.status, 200);
        assert.equal(active.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await active.json(), {
          mode: 'active',
        });
        assert.equal((await fetch(base + '/api/v1/app-status')).status, 404);

        const repository = app.get(AppStatusRepository);
        const read = t.mock.method(repository, 'read', async () => {
          await delay(25);
          return { mode: 'maintenance' };
        });
        await delay(1050);

        const responses = await Promise.all([
          ...Array.from({ length: 8 }, () => fetch(endpoint)),
          fetch(base + '/api/v1/greeting'),
          fetch(base + '/api/health'),
          fetch(base + '/api/health/ready'),
          fetch(base + '/api/v1/auth/telegram', { method: 'POST' }),
        ]);
        assert.equal(read.mock.callCount(), 1);
        for (const response of responses.slice(0, 8)) {
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), {
            mode: 'maintenance',
          });
        }
        assert.equal(responses[8].status, 503);
        assert.equal((await responses[8].json()).code, 'MAINTENANCE');
        assert.equal(responses[9].status, 200);
        assert.equal(responses[10].status, 200);
        assert.equal(responses[11].status, 503);
        assert.equal((await responses[11].json()).code, 'MAINTENANCE');

        read.mock.restore();
        const failure = t.mock.method(repository, 'read', async () => {
          throw new Error('internal storage failure');
        });
        await delay(1050);
        for (const path of [endpoint, base + '/api/v1/greeting']) {
          const response = await fetch(path);
          assert.equal(response.status, 503);
          assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
        }
        assert.equal(failure.mock.callCount(), 1);
        assert.equal((await fetch(base + '/api/health')).status, 200);

        failure.mock.restore();
        await delay(1050);
        assert.equal((await (await fetch(endpoint)).json()).mode, 'active');
      },
    );
  } finally {
    await app?.close();
  }
});
