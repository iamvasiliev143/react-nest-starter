import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const launchParams = new URLSearchParams({
  tgWebAppData: new URLSearchParams({
    auth_date: '1795219200',
    hash: 'fixture',
    signature: 'fixture',
  }).toString(),
  tgWebAppVersion: '8.0',
  tgWebAppPlatform: 'android',
  tgWebAppThemeParams: '{}',
}).toString();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health/app', (route) =>
    route.fulfill({ json: { mode: 'active' } }),
  );
  await page.route('**/api/v1/auth/telegram', (route) =>
    route.fulfill({ json: { accessToken: 'fixture', expiresIn: 900 } }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: { id: '12345', referralCode: 'rAbCdEfGh01234567' } }),
  );
});

test('loads API status and navigates to the accessible time form', async ({
  page,
}) => {
  await page.goto('/#' + launchParams);
  await expect(page.getByText('API подключён', { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('section:has(#wallet-title)')
        .analyze()
    ).violations,
  ).toEqual([]);

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
  await page.goto('/?private=secret#' + launchParams);
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

test('waits for maintenance to end before starting sign-in', async ({
  page,
}) => {
  let mode: 'maintenance' | 'active' = 'maintenance';
  const authRequests: string[] = [];
  await page.route('**/api/health/app', (route) =>
    route.fulfill({ json: { mode } }),
  );
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/v1/auth/')) {
      authRequests.push(request.method());
    }
  });

  await page.goto('/time#' + launchParams);
  await expect(
    page.getByRole('heading', { name: 'Технические работы' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Приложение откроется автоматически, когда работы завершатся.',
    ),
  ).toBeVisible();
  expect(authRequests).toEqual([]);

  mode = 'active';
  await expect(page.getByRole('heading', { name: 'Дата и время' })).toBeVisible(
    {
      timeout: 8000,
    },
  );
  await expect.poll(() => authRequests).toEqual(['POST']);
});
