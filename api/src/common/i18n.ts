import { fileURLToPath } from 'node:url';
import {
  AcceptLanguageLocaleResolver,
  I18nModule,
  JsonI18nLoader,
} from '@nestjs/i18n';

/**
 * Переводы лежат в `src/i18n/<locale>/<namespace>.json`: файл `greeting.json`
 * даёт ключи `greeting.*`. Nest копирует их в `dist/i18n` (assets в nest-cli.json).
 */
const catalogPath = fileURLToPath(new URL('../i18n', import.meta.url));

export const AppI18nModule = I18nModule.forRoot({
  defaultLocale: 'en',
  supportedLocales: ['en', 'ru'],
  loader: new JsonI18nLoader({ path: catalogPath }),
  resolvers: [new AcceptLanguageLocaleResolver()],
});
