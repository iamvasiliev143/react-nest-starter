import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app.js';
import type { Environment } from './environment.js';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  await app.listen(
    config.get('PORT', { infer: true }),
    config.get('HOST', { infer: true }),
  );
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
