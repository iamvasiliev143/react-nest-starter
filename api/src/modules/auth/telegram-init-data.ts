import { parse, validate } from '@tma.js/init-data-node';

const MAX_AGE_SECONDS = 300;
const CLOCK_SKEW_MS = 30_000;

/**
 * Проверяет подпись и свежесть Telegram initData.
 * Возвращает id пользователя или null, если данные недействительны.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): string | null {
  try {
    const params = new URLSearchParams(initData);
    if (params.size !== new Set(params.keys()).size) return null;
    validate(initData, botToken, { expiresIn: MAX_AGE_SECONDS });
    const { user, auth_date: authDate } = parse(initData);
    if (
      !user ||
      !Number.isSafeInteger(user.id) ||
      user.id < 1 ||
      authDate.getTime() > Date.now() + CLOCK_SKEW_MS
    ) {
      return null;
    }
    return String(user.id);
  } catch {
    return null;
  }
}
