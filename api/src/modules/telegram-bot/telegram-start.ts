import type { Bot } from 'grammy';
import type { UsersService } from '../users/users.service.js';

export function registerTelegramStart(bot: Bot, users: UsersService) {
  bot.chatType('private').command('start', async (context) => {
    const sender = context.from;
    if (
      !sender ||
      sender.is_bot ||
      !Number.isSafeInteger(sender.id) ||
      sender.id < 1
    ) {
      return;
    }

    await users.upsert(
      {
        id: String(sender.id),
        firstName: sender.first_name,
        lastName: sender.last_name ?? null,
        username: sender.username ?? null,
        languageCode: sender.language_code ?? null,
        isPremium: sender.is_premium === true,
      },
      context.match,
    );
  });
}
