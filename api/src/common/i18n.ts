import { fileURLToPath } from 'node:url';
import {
  AcceptLanguageLocaleResolver,
  I18nModule,
  JsonI18nLoader,
} from '@nestjs/i18n';

const catalogPath = fileURLToPath(new URL('../i18n', import.meta.url));

export const AppI18nModule = I18nModule.forRoot({
  defaultLocale: 'en',
  supportedLocales: ['en', 'ru'],
  loader: new JsonI18nLoader({ path: catalogPath }),
  resolvers: [new AcceptLanguageLocaleResolver()],
});
