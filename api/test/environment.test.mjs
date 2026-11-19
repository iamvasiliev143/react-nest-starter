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
