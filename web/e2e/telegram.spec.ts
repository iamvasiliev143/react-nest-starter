import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

test('initializes a Telegram WebView and signs in again after a protected 401', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 750 });
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
      swipeBehavior?: { allow_vertical_swipe: boolean };
    };
    target.miniAppEvents = [];
    const events: Record<string, [string, unknown]> = {
      web_app_request_viewport: [
        'viewport_changed',
        { width: 390, height: 750, is_expanded: true, is_state_stable: true },
      ],
      web_app_request_safe_area: [
        'safe_area_changed',
        { top: 20, bottom: 24, left: 0, right: 0 },
      ],
      web_app_request_content_safe_area: [
        'content_safe_area_changed',
        { top: 35, bottom: 12, left: 0, right: 0 },
      ],
      web_app_request_fullscreen: [
        'fullscreen_failed',
        { error: 'UNSUPPORTED' },
      ],
    };
    target.TelegramWebviewProxy = {
      postEvent(name, data) {
        target.miniAppEvents?.push(name);
        if (name === 'web_app_setup_swipe_behavior') {
          target.swipeBehavior = JSON.parse(data);
        }
        const event = events[name];
        if (event)
          queueMicrotask(() =>
            target.Telegram?.WebView?.receiveEvent(...event),
          );
      },
    };
  });

  let attempts = 0;
  let exchanges = 0;
  let mode: 'active' | 'maintenance' = 'active';
  let acceptTelegramData = false;
  let rejectProfile = false;
  await page.route('**/api/health/app', (route) =>
    route.fulfill({ json: { mode } }),
  );
  await page.route('**/api/v1/auth/telegram', async (route) => {
    attempts += 1;
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
    await route.fulfill({
      json: { id: '12345', referralCode: 'rAbCdEfGh01234567' },
    });
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
  await page.goto('/?miniAppSize=fullscreen#' + params.toString());
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /maximum-scale=1, user-scalable=no/,
  );
  await expect(page.locator('html')).toHaveCSS('touch-action', 'pan-x pan-y');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { miniAppEvents?: string[] }).miniAppEvents ?? [],
      ),
    )
    .toContain('web_app_ready');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const { miniAppEvents } = window as Window & {
          miniAppEvents?: string[];
        };
        return miniAppEvents;
      }),
    )
    .toEqual(
      expect.arrayContaining(['web_app_request_fullscreen', 'web_app_expand']),
    );
  expect(
    await page.evaluate(
      () => (window as Window & { swipeBehavior?: unknown }).swipeBehavior,
    ),
  ).toEqual({ allow_vertical_swipe: false });
  await expect(page.locator('html')).toHaveCSS(
    '--tg-theme-bg-color',
    '#eef4fa',
  );
  await expect(page.locator('main')).toHaveCSS('padding-top', '55px');
  await expect(page.getByRole('navigation')).toHaveCSS(
    'padding-bottom',
    '36px',
  );
  await expect(page.locator('.app-shell')).toHaveCSS(
    'background-color',
    'rgb(16, 21, 33)',
  );
  const editNote = page.getByRole('button', { name: 'Edit note' });
  await editNote.click();
  const noteDialog = page.getByRole('dialog', { name: 'Edit note' });
  await expect(noteDialog).toBeFocused();
  const input = noteDialog.getByRole('textbox', { name: 'Note' });
  const save = noteDialog.getByRole('button', { name: 'Save' });
  await page.keyboard.press('Shift+Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('outline-style', 'solid');
  await input.fill('Telegram note');
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) throw new Error('Visual viewport is unavailable');
    Object.defineProperty(viewport, 'height', {
      configurable: true,
      value: 460,
    });
    viewport.dispatchEvent(new Event('resize'));
  });
  const popup = page.locator('.note-popup-body');
  await expect(popup).toHaveCSS('bottom', '290px');
  await expect(popup).toHaveCSS('padding-bottom', '36px');
  await expect(popup).toHaveCSS('background-color', 'rgb(26, 33, 49)');
  await expect(save).toBeInViewport();
  const saveBounds = await save.boundingBox();
  if (!saveBounds) throw new Error('Save button has no bounding box');
  expect(saveBounds.y + saveBounds.height).toBeLessThanOrEqual(460);
  await save.click();
  await expect(noteDialog).toHaveCount(0);
  await expect(editNote).toBeFocused();
  await expect(page.getByText('Telegram note')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 860 });
  await expect(page.locator('html')).toHaveCSS(
    '--tg-viewport-stable-height',
    '750px',
  );
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(16, 21, 33)',
  );
  await expect
    .poll(() =>
      page
        .getByRole('navigation')
        .evaluate((nav) =>
          Math.round(nav.getBoundingClientRect().bottom - window.innerHeight),
        ),
    )
    .toBe(0);
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
    '--tg-theme-bg-color',
    '#20242a',
  );
  const signIn = page.getByRole('button', { name: 'Sign in with Telegram' });
  await expect(page.getByRole('alert')).toHaveText(
    'Could not verify your Telegram data. Reopen the Mini App from Telegram.',
  );
  expect(attempts).toBe(1);
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
  expect(attempts).toBe(3);

  await page.getByRole('link', { name: 'Date and time' }).click();
  mode = 'maintenance';
  await expect(
    page.getByRole('heading', { name: 'Scheduled maintenance' }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText('The app will reopen automatically when maintenance ends.'),
  ).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  mode = 'active';
  await expect(
    page.getByRole('heading', { name: 'Date and time' }),
  ).toBeVisible({ timeout: 8000 });
  expect(attempts).toBe(3);
});

test('blocks startup when Telegram launch data is missing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.defineProperty(window, 'launchErrorEvents', { value: events });
    Object.defineProperty(window, 'TelegramWebviewProxy', {
      value: {
        postEvent(event: string) {
          events.push(event);
        },
      },
    });
  });

  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      apiRequests.push(request.url());
    }
  });

  await page.goto('/time');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(
    page.getByRole('heading', { name: 'Не удалось войти' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, 'launchErrorEvents')),
  ).toEqual(['web_app_ready']);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await expect(page.getByRole('button')).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});

test('blocks startup in a regular browser without Telegram launch data', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Не удалось войти' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'React + NestJS' }),
  ).toHaveCount(0);
});
