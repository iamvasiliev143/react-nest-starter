import {
  Injectable,
  ServiceUnavailableException,
  type CallHandler,
  type NestInterceptor,
} from '@nestjs/common';
import { AppConfig } from '../../common/config/app-config.js';

/**
 * Отвечает 503, пока вход через Telegram не настроен.
 * Interceptor выполняется после заголовков `@Header` и до pipes:
 * ответ сохраняет `Cache-Control`, а 503 приходит раньше проверки тела.
 */
@Injectable()
export class TelegramSignInEnabledInterceptor implements NestInterceptor {
  constructor(private readonly config: AppConfig) {}

  intercept(_context: unknown, next: CallHandler) {
    if (!this.config.get('TELEGRAM_BOT_TOKEN', { infer: true }))
      throw new ServiceUnavailableException('Telegram sign-in is disabled');
    return next.handle();
  }
}
