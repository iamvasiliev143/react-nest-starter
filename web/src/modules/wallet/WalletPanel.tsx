import { themeParams, useSignal } from '@tma.js/sdk-react';
import {
  THEME,
  TonConnectButton,
  TonConnectUIProvider,
  useIsConnectionRestored,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function WalletPanel({ manifestUrl }: { manifestUrl: string }) {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl} restoreConnection>
      <WalletButton />
    </TonConnectUIProvider>
  );
}

function WalletButton() {
  const { i18n, t } = useTranslation('navigation');
  const [, setOptions] = useTonConnectUI();
  const connectionRestored = useIsConnectionRestored();
  const background = useSignal(themeParams.bgColor);
  const isDark = useSignal(themeParams.isDark);
  const language = i18n.resolvedLanguage === 'ru' ? 'ru' : 'en';
  const theme = background ? (isDark ? THEME.DARK : THEME.LIGHT) : 'SYSTEM';

  useEffect(() => {
    setOptions({ language, uiPreferences: { theme } });
  }, [language, setOptions, theme]);

  return connectionRestored ? (
    <TonConnectButton />
  ) : (
    <p role="status">{t('walletRestoring')}</p>
  );
}
