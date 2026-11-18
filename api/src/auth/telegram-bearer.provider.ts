import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import type { Environment } from '../environment.js';
import type { TelegramUser } from './telegram-auth.dto.js';
import { TelegramUsersService } from './telegram-users.service.js';

@Injectable()
export class TelegramBearer extends JwtBearerProvider<TelegramUser> {
  constructor(
    config: ConfigService<Environment, true>,
    registry: AuthenticationRegistry,
    private readonly users: TelegramUsersService,
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
