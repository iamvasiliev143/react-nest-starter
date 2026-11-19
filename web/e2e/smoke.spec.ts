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

test('reports runtime errors without private error text or launch parameters', async ({
  page,
}) => {
  const reports: unknown[] = [];
  await page.route('**/api/v1/client-errors', async (route) => {
    expect(route.request().headers().referer).toBeUndefined();
    expect(route.request().headers().authorization).toBeUndefined();
    reports.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto('/?private=secret');
  await expect(
    page.getByRole('heading', { name: 'React + NestJS' }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new TypeError('SECRET initData=private-value'),
        message: 'SECRET initData=private-value',
      }),
    );
  });
  await expect
    .poll(() => reports)
    .toEqual([{ source: 'window', kind: 'TypeError', page: 'home' }]);
  await page.getByRole('link', { name: 'Дата и время' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Часовой пояс' }),
  ).toBeVisible();
});
