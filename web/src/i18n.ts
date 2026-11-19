import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof ru };
  }
}

const resources = {
  en: { translation: en },
  ru: { translation: ru },
} satisfies Record<'en' | 'ru', { translation: typeof ru }>;

export async function createAppI18n(languageCode?: string) {
  const language = languageCode?.trim().toLowerCase().split('-')[0];
  const i18n = createInstance().use(initReactI18next);
  await i18n.init({
    resources,
    lng: language === 'en' ? 'en' : 'ru',
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  });
  return i18n;
}
