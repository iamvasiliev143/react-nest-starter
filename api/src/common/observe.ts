import { createObserveModule } from '@nestjs/observe';
import { AppConfig } from './config/app-config';

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  sourceContext: false,
});

export const AppObserveModule = ObserveModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => {
    const appKey = config.get('OBSERVE_APP_KEY', { infer: true }) ?? '';
    const appSecret = config.get('OBSERVE_APP_SECRET', { infer: true }) ?? '';
    return {
      appKey,
      appSecret,
      serviceId: 'starter-api',
      enabled: Boolean(appKey && appSecret),
      forwardLogs: true,
      http: { capture: false },
    };
  },
});
