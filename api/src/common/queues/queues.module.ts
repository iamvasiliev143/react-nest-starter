import { BullModule } from '@nestjs/bullmq';
import { AppConfig } from '../config/app-config.js';

export const AppQueuesModule = BullModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => ({
    connection: {
      url:
        config.get('QUEUE_REDIS_URL', { infer: true }) ??
        config.get('REDIS_URL', { infer: true }),
      connectTimeout: 3000,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }),
});
