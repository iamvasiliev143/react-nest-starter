import { expect, test } from 'vitest';
import { createAppI18n } from './index';

const files = import.meta.glob('./{en,ru}/*.json', {
  eager: true,
  import: 'default',
});

function catalogs(language: 'en' | 'ru') {
  const folder = `./${language}/`;
  return Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => path.startsWith(folder))
      .map(([path, content]) => [path.slice(folder.length, -5), content]),
  );
}

function catalogShape(value: unknown): unknown {
  if (typeof value === 'string') {
    const parameters = [
      ...value.matchAll(/{{\s*-?\s*([^\s,}]+)(?:\s*,[^}]*)?\s*}}/g),
    ];
    return [...new Set(parameters.map(([, parameter]) => parameter))].sort();
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Translation catalogs contain text or nested keys');
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, catalogShape(entry)]),
  );
}

test('registers matching translation keys and interpolation parameters in both languages', async () => {
  const ru = catalogs('ru');
  const en = catalogs('en');
  const i18n = await createAppI18n('en-GB');

  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  expect(i18n.options.ns).toHaveLength(Object.keys(ru).length);
  expect(catalogShape(en)).toEqual(catalogShape(ru));
  for (const namespace of Object.keys(ru)) {
    expect(i18n.getResourceBundle('ru', namespace)).toEqual(ru[namespace]);
    expect(i18n.getResourceBundle('en', namespace)).toEqual(en[namespace]);
  }
  expect(i18n.t('auth:signedIn', { id: '42' })).toContain('42');
});
