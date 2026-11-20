import {
  backButton,
  initFp,
  isTMA,
  miniApp,
  postEventFp,
  retrieveLaunchParamsFp,
  retrieveRawInitDataFp,
  swipeBehavior,
  themeParams,
  viewport,
} from '@tma.js/sdk-react';

let initialized = false;
let initData: string | undefined;
let languageCode: string | undefined;

export function readTelegramInitData() {
  const raw = retrieveRawInitDataFp();
  if (raw._tag === 'Right' && raw.right._tag === 'Some') {
    const value = raw.right.value;
    if (value.trim()) return value;
  }
}

export function initializeTelegram() {
  if (initialized) return;
  initData = readTelegramInitData();
  if (!isTMA() || initFp()._tag === 'Left') return;
  initialized = true;
  document.documentElement.classList.add('telegram-webview');
  const viewportMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  if (viewportMeta) {
    viewportMeta.content +=
      ', minimum-scale=1, maximum-scale=1, user-scalable=no';
  }
  const launch = retrieveLaunchParamsFp();
  if (launch._tag === 'Right') {
    languageCode = launch.right.tgWebAppData?.user?.language_code;
  }
  themeParams.mount.ifAvailable();
  themeParams.bindCssVars.ifAvailable();
  backButton.mount.ifAvailable();
  swipeBehavior.mount.ifAvailable();
  swipeBehavior.disableVertical.ifAvailable();

  const size = new URLSearchParams(location.search).get('miniAppSize');
  if (size === 'expanded') viewport.expand.ifAvailable();

  const mounting = viewport.mount.ifAvailable({ timeout: 1000 });
  const ready = mounting.ok
    ? mounting.data
        .then(() => {
          viewport.bindCssVars.ifAvailable();
        })
        .catch(() => {
          // Native viewport is optional. CSS keeps its browser fallbacks.
        })
    : Promise.resolve();
  if (size === 'fullscreen') void ready.then(openFullscreen);
}

async function openFullscreen() {
  try {
    const request = viewport.requestFullscreen.ifAvailable({ timeout: 1500 });
    if (request.ok) {
      await request.data;
      return;
    }
  } catch {
    // A rejected native request falls back to expanded height.
  }
  viewport.expand.ifAvailable();
}

export function telegramReady() {
  if (initialized) miniApp.ready.ifAvailable();
}

export function telegramLaunchErrorReady() {
  postEventFp('web_app_ready');
}

export function getTelegramInitData() {
  return initData;
}

export function getTelegramLanguage() {
  return languageCode;
}

export function showTelegramBackButton(onBack: () => void) {
  if (!backButton.show.isAvailable() || !backButton.onClick.isAvailable())
    return;
  backButton.show();
  const unsubscribe = backButton.onClick(onBack);
  return () => {
    unsubscribe();
    backButton.hide.ifAvailable();
  };
}
