import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads API status and navigates to the accessible time form', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('API подключён');
  await expect(
    page.getByRole('button', { name: 'Войти через Telegram' }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('link', { name: 'Дата и время' }).click();
  await page
    .getByRole('combobox', { name: 'Часовой пояс' })
    .selectOption('Europe/Kyiv');
  await page.getByRole('button', { name: 'Показать время' }).click();
  await expect(page.getByRole('status')).toContainText('Europe/Kyiv');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
