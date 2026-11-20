import { parse, validate } from '@tma.js/init-data-node';
import type { UserProfile } from '../users/interfaces/user.interface.js';

const MAX_AGE_SECONDS = 300;
const CLOCK_SKEW_MS = 30_000;

/**
 * Проверяет подпись и свежесть Telegram initData.
 * Возвращает поля подтверждённого профиля или null при недействительных данных.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): { profile: UserProfile; startParam: string | undefined } | null {
  try {
    const params = new URLSearchParams(initData);
    if (params.size !== new Set(params.keys()).size) return null;
    validate(initData, botToken, { expiresIn: MAX_AGE_SECONDS });
    const {
      user,
      auth_date: authDate,
      start_param: startParam,
    } = parse(initData);
    if (
      !user ||
      !Number.isSafeInteger(user.id) ||
      user.id < 1 ||
      authDate.getTime() > Date.now() + CLOCK_SKEW_MS
    ) {
      return null;
    }
    return {
      startParam,
      profile: {
        id: String(user.id),
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        username: user.username ?? null,
        languageCode: user.language_code ?? null,
        isPremium: user.is_premium === true,
        photoUrl: user.photo_url,
      },
    };
  } catch {
    return null;
  }
}
