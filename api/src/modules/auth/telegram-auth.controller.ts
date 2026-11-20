import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser, Public, TokenService } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AppConfig } from '../../common/config/app-config.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import type { UserIdentity } from '../users/interfaces/user.interface.js';
import { UsersService } from '../users/users.service.js';
import {
  telegramExchangeSchema,
  type TelegramExchangeRequest,
} from './dto/telegram-exchange.request.dto.js';
import { TelegramToken } from './dto/telegram-token.response.dto.js';
import { TelegramUser } from './dto/telegram-user.response.dto.js';
import { TelegramSignInEnabledInterceptor } from './telegram-sign-in-enabled.interceptor.js';
import { verifyTelegramInitData } from './telegram-init-data.js';

const invalidCredentials = () =>
  new UnauthorizedException('Invalid Telegram credentials');

@Controller({ path: 'auth', version: '1' })
export class TelegramAuthController {
  constructor(
    private readonly config: AppConfig,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('telegram')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(TelegramSignInEnabledInterceptor)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['initData'],
      properties: { initData: { type: 'string', maxLength: 8192 } },
    },
  })
  @ApiOkResponse({ type: TelegramToken })
  async exchange(
    @Body(new ZodValidationPipe(telegramExchangeSchema, invalidCredentials))
    body: TelegramExchangeRequest,
  ): Promise<TelegramToken> {
    const botToken = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    const verified = botToken
      ? verifyTelegramInitData(body.initData, botToken)
      : null;
    if (!verified) throw invalidCredentials();
    const { profile, startParam } = verified;
    await this.users.upsert(profile, startParam);
    const { accessToken, expiresIn } = await this.tokens.issue(profile.id, {
      method: 'telegram',
    });
    return { accessToken, expiresIn };
  }

  @Get('me')
  @Can.Anyone()
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOkResponse({ type: TelegramUser })
  me(@CurrentUser() user: UserIdentity): TelegramUser {
    const username = this.config.get('TELEGRAM_BOT_USERNAME', { infer: true });
    if (!username) return user;

    const shortName = this.config.get('TELEGRAM_MINI_APP_SHORT_NAME', {
      infer: true,
    });
    const bot = new URL(username, 'https://t.me/');
    const miniApp = shortName
      ? new URL(shortName, bot.href + '/')
      : new URL(bot);
    const referral = 'ref_' + user.referralCode;
    bot.searchParams.set('start', referral);
    miniApp.searchParams.set('startapp', referral);
    return {
      ...user,
      referralLinks: { bot: bot.href, miniApp: miniApp.href },
    };
  }
}
