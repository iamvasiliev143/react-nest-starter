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
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
