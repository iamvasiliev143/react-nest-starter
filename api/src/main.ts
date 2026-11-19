import { Logger } from '@nestjs/common';
import { AppConfig } from './common/config/app-config.js';
import { createApp } from './create-app.js';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();
  const config = app.get(AppConfig);
  await app.listen(
    config.get('PORT', { infer: true }),
    config.get('HOST', { infer: true }),
  );

  const logger = new Logger('Bootstrap');
  const baseUrl = await app.getUrl();
  logger.log(`API is listening at ${baseUrl}`);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    logger.log(`Swagger UI is available at ${baseUrl}/api/docs`);
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
