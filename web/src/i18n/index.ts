import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enNavigation from './en/navigation.json';
import enHealth from './en/health.json';
import enAuth from './en/auth.json';
import enTime from './en/time.json';
import enErrors from './en/errors.json';
import ruNavigation from './ru/navigation.json';
import ruHealth from './ru/health.json';
import ruAuth from './ru/auth.json';
import ruTime from './ru/time.json';
import ruErrors from './ru/errors.json';

const ru = {
  navigation: ruNavigation,
  health: ruHealth,
  auth: ruAuth,
  time: ruTime,
  errors: ruErrors,
};
const resources = {
  en: {
    navigation: enNavigation,
    health: enHealth,
    auth: enAuth,
    time: enTime,
    errors: enErrors,
  },
  ru,
} satisfies Record<'en' | 'ru', typeof ru>;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'navigation';
    resources: typeof ru;
  }
}

export async function createAppI18n(languageCode?: string) {
  const language = languageCode?.trim().toLowerCase().split('-')[0];
  const i18n = createInstance().use(initReactI18next);
  await i18n.init({
    resources,
    ns: Object.keys(ru),
    defaultNS: 'navigation',
    lng: language === 'en' ? 'en' : 'ru',
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  });
  return i18n;
}
