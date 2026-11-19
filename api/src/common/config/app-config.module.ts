import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './environment.js';

/** Глобальная конфигурация, проверенная Zod-схемой окружения. */
export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  skipProcessEnv: true,
  validate: validateEnvironment,
});
