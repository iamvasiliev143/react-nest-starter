import { Injectable, Logger } from '@nestjs/common';
import { Api, GrammyError } from 'grammy';
import { AppConfig } from '../../common/config/app-config.js';

@Injectable()
export class TelegramBotMenuService {
  private readonly logger = new Logger(TelegramBotMenuService.name);

  constructor(private readonly config: AppConfig) {}

  async sync(): Promise<void> {
    const token = this.config
      .get('TELEGRAM_BOT_TOKEN', { infer: true })
      ?.trim();
    const address = this.config.get('TELEGRAM_MINI_APP_URL', { infer: true });
    if (!token || !address) return;

    try {
      const url = new URL(address);
      const size = this.config.get('TELEGRAM_MINI_APP_SIZE', { infer: true });
      if (size === 'default') url.searchParams.delete('miniAppSize');
      else url.searchParams.set('miniAppSize', size);

      const api = new Api(token, { timeoutSeconds: 10 });
      await api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: this.config.get('TELEGRAM_MINI_APP_BUTTON_TEXT', {
            infer: true,
          }),
          web_app: { url: url.href },
        },
      });
      this.logger.log('Telegram bot menu button updated.');
    } catch (error) {
      const code =
        error instanceof GrammyError ? ` (code ${error.error_code})` : '';
      this.logger.warn(`Could not update the Telegram bot menu button${code}.`);
    }
  }
}
