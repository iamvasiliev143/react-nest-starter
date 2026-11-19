import { Logger, type INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

// Socket.IO uses fire-and-forget Redis Pub/Sub commands. During a disconnect,
// ioredis can reject a command even though Socket.IO does not await its result.
class SocketRedis extends Redis {
  override sendCommand(
    ...args: Parameters<Redis['sendCommand']>
  ): ReturnType<Redis['sendCommand']> {
    const result = super.sendCommand(...args);
    void args[0].promise.catch(() => {});
    return result;
  }
}

export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  private publisher?: Redis;
  private subscriber?: Redis;

  constructor(
    app: INestApplicationContext,
    private readonly redis: Redis,
    private readonly channel: string,
  ) {
    super(app);
  }

  override createIOServer(
    port: number | undefined,
    options?: ServerOptions,
  ): Server {
    const server: Server = super.createIOServer(port, options);
    const sharedOptions = {
      ...this.redis.options,
      lazyConnect: false,
      replyMapping: 'legacy' as const,
    };

    this.publisher ??= this.watch(
      new SocketRedis({
        ...sharedOptions,
        enableOfflineQueue: false,
        autoResendUnfulfilledCommands: false,
      }),
      'publisher',
    );
    this.subscriber ??= this.watch(
      new SocketRedis({
        ...sharedOptions,
        commandTimeout: undefined,
        maxRetriesPerRequest: null,
      }),
      'subscriber',
    );

    // Redis Pub/Sub ignores SELECT, so include the DB number in the channel.
    server.adapter(
      createAdapter(this.publisher, this.subscriber, {
        key: `${this.channel}:${this.redis.options.db}`,
        publishOnSpecificResponseChannel: true,
      }),
    );
    server.use((_socket, next) => next(new Error('Unavailable namespace')));
    return server;
  }

  override async dispose(): Promise<void> {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
    await super.dispose();
  }

  private watch(redis: Redis, role: string): Redis {
    let unavailable = false;
    redis.on('error', () => {
      if (!unavailable)
        this.redisLogger.warn(`Socket.IO Redis ${role} is unavailable`);
      unavailable = true;
    });
    redis.on('ready', () => {
      unavailable = false;
    });
    return redis;
  }
}
