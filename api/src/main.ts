import { Logger } from '@nestjs/common';
import { API_PREFIX } from './app-setup.js';
import { AppConfig } from './common/config/app-config.js';
import { createApp } from './create-app.js';
import { TelegramBotMenuService } from './modules/telegram-bot/telegram-bot-menu.service.js';
import { TelegramBotUpdatesService } from './modules/telegram-bot/telegram-bot-updates.service.js';
import { SWAGGER_UI_PATH } from './swagger.js';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();
  const config = app.get(AppConfig);
  await app.listen(
    config.get('PORT', { infer: true }),
    config.get('HOST', { infer: true }),
  );
  void app.get(TelegramBotMenuService).sync();
  void app.get(TelegramBotUpdatesService).start();

  const logger = new Logger('Bootstrap');
  const baseUrl = await app.getUrl();
  logger.log(`API is listening at ${baseUrl}`);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    logger.log(
      `Swagger UI is available at ${baseUrl}/${API_PREFIX}${SWAGGER_UI_PATH}`,
    );
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
