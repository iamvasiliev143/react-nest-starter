import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { AppConfig } from '../../common/config/app-config.js';
import { UsersService, type UserIdentity } from '../users/users.service.js';

@Injectable()
export class TelegramBearer extends JwtBearerProvider<UserIdentity> {
  constructor(
    config: AppConfig,
    registry: AuthenticationRegistry,
    private readonly users: UsersService,
  ) {
    super({ realm: 'telegram-mini-app' });
    if (config.get('AUTH_TOKEN_SECRET', { infer: true }))
      registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims) {
    if (!sub || !/^\d+$/.test(sub)) return null;
    return this.users.find(sub);
  }
}
