import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, Public, TokenService } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Environment } from '../../environment.js';
import { telegramExchangeSchema } from './dto/telegram-exchange.request.dto.js';
import { TelegramToken } from './dto/telegram-token.response.dto.js';
import { TelegramUser } from './dto/telegram-user.response.dto.js';
import { verifyTelegramInitData } from './telegram-init-data.js';
import {
  TelegramUsersService,
  type TelegramUserIdentity,
} from './telegram-users.service.js';

@Controller('auth')
export class TelegramAuthController {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly tokens: TokenService,
    private readonly users: TelegramUsersService,
  ) {}

  @Public()
  @Post('telegram')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['initData'],
      properties: { initData: { type: 'string', maxLength: 8192 } },
    },
  })
  @ApiOkResponse({ type: TelegramToken })
  async exchange(@Body() body: unknown): Promise<TelegramToken> {
    const botToken = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    if (!botToken)
      throw new ServiceUnavailableException('Telegram sign-in is disabled');
    const parsed = telegramExchangeSchema.safeParse(body);
    const id = parsed.success
      ? verifyTelegramInitData(parsed.data.initData, botToken)
      : null;
    if (!id) throw new UnauthorizedException('Invalid Telegram credentials');
    await this.users.ensure(id);
    const { accessToken, expiresIn } = await this.tokens.issue(id, {
      method: 'telegram',
    });
    return { accessToken, expiresIn };
  }

  @Get('me')
  @Can.Anyone()
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOkResponse({ type: TelegramUser })
  me(@CurrentUser() user: TelegramUserIdentity): TelegramUser {
    return user;
  }
}
