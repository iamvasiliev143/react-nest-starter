import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  BullModule,
  Processor,
  WorkerHost,
  getQueueToken,
} from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { QueueEvents } from 'bullmq';
import { AppConfig } from '../dist/common/config/app-config.js';
import { validateEnvironment } from '../dist/common/config/environment.js';
import { AppQueuesModule } from '../dist/common/queues/queues.module.js';

test(
  'BullMQ processes jobs using the dedicated Redis connection',
  { timeout: 12_000 },
  async () => {
    const redisUrl = new URL(
      process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6380',
    );
    const queueRedisUrl = new URL(redisUrl);
    queueRedisUrl.pathname = '/3';
    redisUrl.pathname = '/4';
    const queueName = 'starter-queue-test-' + randomUUID();
    const config = new ConfigService(
      validateEnvironment({
        NODE_ENV: 'test',
        DATABASE_URL:
          'postgresql://starter:starter-local@127.0.0.1:5434/starter',
        REDIS_URL: redisUrl.href,
        QUEUE_REDIS_URL: queueRedisUrl.href,
        S3_BUCKET: 'starter-test',
        S3_ACCESS_KEY_ID: 'starter',
        S3_SECRET_ACCESS_KEY: 'starter-local-secret',
      }),
    );
    config.skipProcessEnv = true;

    class TestConfigModule {}
    Global()(TestConfigModule);
    Module({
      providers: [{ provide: AppConfig, useValue: config }],
      exports: [AppConfig],
    })(TestConfigModule);

    class TestProcessor extends WorkerHost {
      async process(job) {
        assert.equal(job.name, 'double');
        return { value: job.data.value * 2 };
      }
    }
    Processor(queueName)(TestProcessor);

    class TestQueuesModule {}
    Module({
      imports: [
        TestConfigModule,
        AppQueuesModule,
        BullModule.registerQueue({ name: queueName }),
      ],
      providers: [TestProcessor],
    })(TestQueuesModule);

    const events = new QueueEvents(queueName, {
      connection: {
        url: queueRedisUrl.href,
        connectTimeout: 3000,
        retryStrategy: () => null,
      },
    });
    events.on('error', () => {});
    let app;
    let queue;
    try {
      await events.waitUntilReady();
      app = await NestFactory.createApplicationContext(TestQueuesModule, {
        abortOnError: false,
        logger: false,
      });
      queue = app.get(getQueueToken(queueName));
      const job = await queue.add('double', { value: 21 });
      assert.deepEqual(await job.waitUntilFinished(events, 5000), {
        value: 42,
      });
      assert.equal(await job.getState(), 'completed');
    } finally {
      try {
        await events.close();
        if (queue) {
          await app.get(TestProcessor).worker.close();
          await queue.obliterate({ force: true });
        }
      } finally {
        await app?.close();
      }
    }
  },
);
