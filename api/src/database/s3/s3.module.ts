import { S3Disk, StorageModule } from '@nestjs/storage';
import { AppConfig } from '../../common/config/app-config.js';

export const S3StorageModule = StorageModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => {
    const endpoint = config.get('S3_ENDPOINT', { infer: true });
    return {
      disks: {
        s3: new S3Disk({
          bucket: config.get('S3_BUCKET', { infer: true }),
          region: config.get('S3_REGION', { infer: true }),
          endpoint,
          // Самостоятельно размещённые хранилища адресуют бакет в пути.
          forcePathStyle: endpoint !== undefined,
          credentials: {
            accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }),
            secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', {
              infer: true,
            }),
          },
          timeout: '10s',
        }),
      },
    };
  },
});
