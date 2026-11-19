import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';

// Отдельный процесс: конфигурация читается один раз при загрузке AppModule.
test('Telegram sign-in answers 503 before body validation when disabled', async () => {
  const storagePath = await mkdtemp(join(tmpdir(), 'starter-storage-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = '';
  process.env.STORAGE_PATH = storagePath;
  process.env.TELEGRAM_BOT_TOKEN = '';
  process.env.AUTH_TOKEN_SECRET = '';
  process.env.OBSERVE_APP_KEY = '';
  process.env.OBSERVE_APP_SECRET = '';
  let app;

  try {
    const { createApp } = await import('../dist/create-app.js');
    const { AppConfig } = await import('../dist/common/config/app-config.js');
    app = await createApp({ docs: false });
    assert.equal(app.get(AppConfig), app.get(ConfigService));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    for (const body of [{}, { initData: 'invalid' }]) {
      const response = await fetch(base + '/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  } finally {
    await app?.close();
    await rm(storagePath, { recursive: true, force: true });
  }
});
