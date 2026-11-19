import { AuthenticationModule } from '@nestjs/authentication';
import { AppConfig } from '../../common/config/app-config.js';

export const AccessTokenModule = AuthenticationModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => {
    const key = config.get('AUTH_TOKEN_SECRET', { infer: true });
    return key
      ? {
          refreshToken: false as const,
          accessToken: {
            key,
            issuer: 'starter-api',
            audience: 'telegram-mini-app',
            ttl: '15m',
          },
        }
      : {};
  },
});
