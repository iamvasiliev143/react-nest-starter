import { expect, test } from '@playwright/test';

test('initializes a Telegram WebView and signs in again after a protected 401', async ({
  page,
}) => {
  const initData = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'fixture',
    signature: 'fixture',
    user: JSON.stringify({
      id: 12345,
      first_name: 'Test',
      language_code: 'en-GB',
    }),
  }).toString();

  await page.addInitScript(() => {
    const target = window as Window & {
      TelegramWebviewProxy?: {
        postEvent: (name: string, data: string) => void;
      };
      Telegram?: {
        WebView?: { receiveEvent: (name: string, data: unknown) => void };
      };
      miniAppEvents?: string[];
    };
    target.miniAppEvents = [];
    const events: Record<string, [string, unknown]> = {
      web_app_request_viewport: [
        'viewport_changed',
        { width: 390, height: 750, is_expanded: true, is_state_stable: true },
      ],
      web_app_request_safe_area: [
        'safe_area_changed',
        { top: 20, bottom: 0, left: 0, right: 0 },
      ],
      web_app_request_content_safe_area: [
        'content_safe_area_changed',
        { top: 35, bottom: 0, left: 0, right: 0 },
      ],
    };
    target.TelegramWebviewProxy = {
      postEvent(name) {
        target.miniAppEvents?.push(name);
        const event = events[name];
        if (event)
          queueMicrotask(() =>
            target.Telegram?.WebView?.receiveEvent(...event),
          );
      },
    };
  });

  let exchanges = 0;
  let acceptTelegramData = false;
  let rejectProfile = false;
  await page.route('**/api/v1/auth/telegram', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ initData });
    if (!acceptTelegramData) {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      return;
    }
    exchanges += 1;
    await route.fulfill({
      json: { accessToken: 'fixture-' + exchanges, expiresIn: 900 },
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    expect(route.request().headers().authorization).toBe(
      'Bearer fixture-' + exchanges,
    );
    if (rejectProfile) {
      await route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      return;
    }
    await route.fulfill({ json: { id: '12345' } });
  });

  const params = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: '8.0',
    tgWebAppPlatform: 'android',
    tgWebAppThemeParams: JSON.stringify({
      bg_color: '#eef4fa',
      text_color: '#171717',
      link_color: '#174c91',
    }),
  });
  await page.goto('/#' + params.toString());
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { miniAppEvents?: string[] }).miniAppEvents ?? [],
      ),
    )
    .toContain('web_app_ready');
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(238, 244, 250)',
  );
  await expect(page.locator('main')).toHaveCSS('padding-top', '55px');
  await page.evaluate(() => {
    const target = window as Window & {
      Telegram?: {
        WebView?: { receiveEvent: (name: string, data: unknown) => void };
      };
    };
    target.Telegram?.WebView?.receiveEvent('theme_changed', {
      theme_params: { bg_color: '#20242a', text_color: '#ffffff' },
    });
  });
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(32, 36, 42)',
  );
  const signIn = page.getByRole('button', { name: 'Sign in with Telegram' });
  await signIn.click();
  await expect(page.getByRole('alert')).toHaveText(
    'Could not verify your Telegram data. Reopen the Mini App from Telegram.',
  );
  acceptTelegramData = true;
  await signIn.click();
  await expect(page.getByText('Signed in. Telegram ID 12345')).toBeVisible();
  expect(await page.context().cookies()).toEqual([]);

  rejectProfile = true;
  await page.getByRole('link', { name: 'Date and time' }).click();
  await expect(
    page.getByRole('heading', { name: 'Date and time' }),
  ).toBeVisible();
  await page.evaluate(() => {
    const { Telegram } = window as Window & {
      Telegram?: {
        WebView?: { receiveEvent: (name: string, data: unknown) => void };
      };
    };
    Telegram?.WebView?.receiveEvent('back_button_pressed', {});
  });
  await expect(page.getByText('Session expired.')).toBeVisible();

  rejectProfile = false;
  await page.getByRole('button', { name: 'Sign in again' }).click();
  await expect(page.getByText('Signed in. Telegram ID 12345')).toBeVisible();
  expect(exchanges).toBe(2);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in with Telegram' }),
  ).toBeVisible();
});

test('loads the public app when the Telegram bridge has no launch parameters', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'TelegramWebviewProxy', {
      value: { postEvent() {} },
    });
  });

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('status')).toHaveText('API подключён');
  await expect(
    page.getByRole('button', { name: 'Войти через Telegram' }),
  ).toHaveCount(0);
});
