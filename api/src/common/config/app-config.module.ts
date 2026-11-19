import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './environment.js';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  skipProcessEnv: true,
  validate: validateEnvironment,
});
