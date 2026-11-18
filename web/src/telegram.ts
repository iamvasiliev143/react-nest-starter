import {
  backButton,
  initFp,
  isTMA,
  miniApp,
  retrieveRawInitDataFp,
  themeParams,
  viewport,
} from '@tma.js/sdk-react';

let initialized = false;
let initData: string | undefined;

export function initializeTelegram() {
  if (!isTMA() || initFp()._tag === 'Left') return;
  initialized = true;
  const raw = retrieveRawInitDataFp();
  if (raw._tag === 'Right' && raw.right._tag === 'Some') {
    initData = raw.right.value;
  }

  themeParams.mount.ifAvailable();
  themeParams.bindCssVars.ifAvailable();
  backButton.mount.ifAvailable();

  const mounting = viewport.mount.ifAvailable({ timeout: 1000 });
  if (mounting) {
    void Promise.resolve(mounting)
      .then(() => {
        viewport.bindCssVars.ifAvailable();
      })
      .catch(() => {
        // Native viewport is optional. CSS keeps its browser fallbacks.
      });
  }
}

export function telegramReady() {
  if (initialized) miniApp.ready.ifAvailable();
}

export function getTelegramInitData() {
  return initData;
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
