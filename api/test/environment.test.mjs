import assert from 'node:assert/strict';
import test from 'node:test';

const { validateEnvironment } =
  await import('../dist/common/config/environment.js');

const valid = {
  DATABASE_URL: 'postgresql://starter:starter-local@127.0.0.1:5434/starter',
  REDIS_URL: 'redis://127.0.0.1:6380',
  S3_BUCKET: 'starter',
  S3_ACCESS_KEY_ID: 'starter',
  S3_SECRET_ACCESS_KEY: 'starter-local-secret',
};

test('validates Mini App menu configuration before startup', () => {
  const defaults = validateEnvironment({ ...valid, TELEGRAM_MINI_APP_URL: '' });
  assert.equal(defaults.TELEGRAM_MINI_APP_URL, undefined);
  assert.equal(defaults.TELEGRAM_MINI_APP_SIZE, 'default');
  for (const url of [
    'not-a-url',
    'http://example.com',
    'https://secret@example.com',
  ]) {
    assert.throws(
      () => validateEnvironment({ ...valid, TELEGRAM_MINI_APP_URL: url }),
      { message: /^TELEGRAM_MINI_APP_URL:/ },
    );
  }
  assert.throws(
    () => validateEnvironment({ ...valid, TELEGRAM_MINI_APP_SIZE: 'large' }),
    { message: /^TELEGRAM_MINI_APP_SIZE:/ },
  );
});

test('PostgreSQL, Redis and S3 are required', () => {
  assert.equal(validateEnvironment(valid).REDIS_URL, valid.REDIS_URL);
  for (const key of [
    'DATABASE_URL',
    'REDIS_URL',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ]) {
    for (const value of [undefined, '']) {
      assert.throws(() => validateEnvironment({ ...valid, [key]: value }), {
        message: new RegExp('^' + key + ':'),
      });
    }
  }
  assert.throws(
    () => validateEnvironment({ ...valid, REDIS_URL: 'http://127.0.0.1:6380' }),
    { message: /^REDIS_URL:/ },
  );
});

test('validates bot polling and direct referral link configuration', () => {
  assert.equal(validateEnvironment(valid).TELEGRAM_BOT_POLLING_ENABLED, false);
  assert.throws(
    () =>
      validateEnvironment({ ...valid, TELEGRAM_BOT_POLLING_ENABLED: 'true' }),
    { message: /^TELEGRAM_BOT_POLLING_ENABLED:/ },
  );
  assert.throws(
    () =>
      validateEnvironment({ ...valid, TELEGRAM_MINI_APP_SHORT_NAME: 'play' }),
    { message: /^TELEGRAM_BOT_USERNAME:/ },
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...valid,
        TELEGRAM_MINI_APP_SHORT_NAME: '../play',
      }),
    { message: /^TELEGRAM_MINI_APP_SHORT_NAME:/ },
  );
  const configured = validateEnvironment({
    ...valid,
    TELEGRAM_BOT_TOKEN: '123456:fixture',
    AUTH_TOKEN_SECRET: 'fixture-secret-with-at-least-32-characters',
    TELEGRAM_BOT_POLLING_ENABLED: 'true',
    TELEGRAM_BOT_USERNAME: 'fixture_bot',
    TELEGRAM_MINI_APP_SHORT_NAME: 'play',
  });
  assert.equal(configured.TELEGRAM_BOT_POLLING_ENABLED, true);
  assert.equal(configured.TELEGRAM_MINI_APP_SHORT_NAME, 'play');
});
