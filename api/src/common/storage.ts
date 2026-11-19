import { mkdir, realpath } from 'node:fs/promises';
import { LocalDisk, StorageModule } from '@nestjs/storage';
import { AppConfig } from './config/app-config.js';

export const AppStorageModule = StorageModule.forRootAsync({
  inject: [AppConfig],
  useFactory: async (config: AppConfig) => {
    const path = config.get('STORAGE_PATH', { infer: true });
    await mkdir(path, { recursive: true });
    return {
      disks: { local: new LocalDisk({ root: await realpath(path) }) },
    };
  },
});
