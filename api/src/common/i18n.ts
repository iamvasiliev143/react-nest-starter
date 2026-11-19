import {
  AcceptLanguageLocaleResolver,
  I18nModule,
  InMemoryI18nLoader,
} from '@nestjs/i18n';

export const translations = {
  en: { app: { greeting: 'Hello' } },
  ru: { app: { greeting: 'Привет' } },
};

export const AppI18nModule = I18nModule.forRoot({
  defaultLocale: 'en',
  supportedLocales: ['en', 'ru'],
  loader: new InMemoryI18nLoader(translations),
  resolvers: [new AcceptLanguageLocaleResolver()],
});
