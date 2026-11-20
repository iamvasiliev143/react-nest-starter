import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import { Api } from 'grammy';
import { TelegramBotMenuService } from '../dist/modules/telegram-bot/telegram-bot-menu.service.js';

const baseConfig = {
  TELEGRAM_BOT_TOKEN: '123:fixture-secret',
  TELEGRAM_MINI_APP_URL: 'https://example.com/app?source=menu#home',
  TELEGRAM_MINI_APP_BUTTON_TEXT: 'Запуск',
  TELEGRAM_MINI_APP_SIZE: 'fullscreen',
};

function createService(overrides) {
  const config = { ...baseConfig, ...overrides };
  return new TelegramBotMenuService({ get: (key) => config[key] });
}

test('syncs the default menu button and preserves the other URL parameters', async (t) => {
  const update = t.mock.method(
    Api.prototype,
    'setChatMenuButton',
    async () => true,
  );
  t.mock.method(Logger.prototype, 'log', () => {});
  await createService().sync();
  assert.deepEqual(
    update.mock.calls.map((call) => call.arguments),
    [
      [
        {
          menu_button: {
            type: 'web_app',
            text: 'Запуск',
            web_app: {
              url: 'https://example.com/app?source=menu&miniAppSize=fullscreen#home',
            },
          },
        },
      ],
    ],
  );
});

test('skips incomplete configuration and logs failures without secret details', async (t) => {
  const update = t.mock.method(Api.prototype, 'setChatMenuButton', async () => {
    throw new Error(baseConfig.TELEGRAM_BOT_TOKEN);
  });
  const warning = t.mock.method(Logger.prototype, 'warn', () => {});
  await createService({ TELEGRAM_MINI_APP_URL: undefined }).sync();
  await createService({ TELEGRAM_BOT_TOKEN: undefined }).sync();
  assert.equal(update.mock.callCount(), 0);

  await createService().sync();
  assert.equal(update.mock.callCount(), 1);
  assert.deepEqual(warning.mock.calls[0].arguments, [
    'Could not update the Telegram bot menu button.',
  ]);
});
