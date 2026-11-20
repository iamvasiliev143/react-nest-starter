import {
  Injectable,
  Logger,
  type BeforeApplicationShutdown,
} from '@nestjs/common';
import { Bot } from 'grammy';
import { AppConfig } from '../../common/config/app-config.js';
import { UsersService } from '../users/users.service.js';
import { registerTelegramStart } from './telegram-start.js';

@Injectable()
export class TelegramBotUpdatesService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(TelegramBotUpdatesService.name);
  private bot?: Bot;
  private polling?: Promise<void>;
  private stopping = false;

  constructor(
    private readonly config: AppConfig,
    private readonly users: UsersService,
  ) {}

  async start(): Promise<void> {
    const enabled = this.config.get('TELEGRAM_BOT_POLLING_ENABLED', {
      infer: true,
    });
    const token = this.config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    if (!enabled || !token || this.bot || this.stopping) return;

    const bot = new Bot(token, { client: { timeoutSeconds: 40 } });
    this.bot = bot;
    registerTelegramStart(bot, this.users);
    bot.catch(() => {
      this.logger.error('Could not process a Telegram bot update.');
    });

    try {
      const webhook = await bot.api.getWebhookInfo();
      if (this.stopping) return;
      if (webhook.url) {
        this.logger.warn(
          'Telegram bot polling is disabled because a webhook is configured.',
        );
        return;
      }
      this.polling = bot.start({
        allowed_updates: ['message'],
        onStart: () => this.logger.log('Telegram bot polling started.'),
      });
      await this.polling;
    } catch {
      if (!this.stopping)
        this.logger.error('Telegram bot polling stopped unexpectedly.');
    } finally {
      this.bot = undefined;
      this.polling = undefined;
    }
  }

  async beforeApplicationShutdown() {
    this.stopping = true;
    const polling = this.polling;
    try {
      await this.bot?.stop();
    } catch {
      this.logger.warn(
        'Could not confirm the last Telegram update during shutdown.',
      );
    }
    await polling?.catch(() => undefined);
  }
}
