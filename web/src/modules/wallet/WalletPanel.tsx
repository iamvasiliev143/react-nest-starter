import { TonConnectButton, TonConnectUIProvider } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';

export default function WalletPanel({ manifestUrl }: { manifestUrl: string }) {
  const { i18n } = useTranslation('navigation');
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      language={i18n.resolvedLanguage === 'ru' ? 'ru' : 'en'}
    >
      <TonConnectButton />
    </TonConnectUIProvider>
  );
}
