import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  ThrottlerStorageService,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import type { Redis } from 'ioredis';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

/**
 * Скользящее окно, как у встроенного ThrottlerStorageService:
 * KEYS[1] — sorted set с отметками попаданий, KEYS[2] — ключ блокировки.
 * Пока блокировка жива, попадания не считаются; при блокировке окно очищается,
 * поэтому после неё счёт начинается заново.
 * Возвращает totalHits, timeToExpire (мс), isBlocked (0/1), timeToBlockExpire (мс).
 */
const INCREMENT = `
local hits, block = KEYS[1], KEYS[2]
local ttl, limit, blockDuration = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local member = ARGV[4]
-- Время Redis, а не экземпляра API: расхождение часов серверов не сдвигает окно.
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

local function windowExpire()
  local oldest = redis.call('ZRANGE', hits, 0, 0, 'WITHSCORES')
  if oldest[2] then return tonumber(oldest[2]) + ttl - now end
  return ttl
end

redis.call('ZREMRANGEBYSCORE', hits, '-inf', now - ttl)

if blockDuration > 0 then
  local blockedFor = redis.call('PTTL', block)
  if blockedFor > 0 then
    return { tonumber(redis.call('GET', block)), windowExpire(), 1, blockedFor }
  end
  redis.call('ZADD', hits, now, member)
  redis.call('PEXPIRE', hits, ttl)
  local count = redis.call('ZCARD', hits)
  if count > limit then
    redis.call('SET', block, count, 'PX', blockDuration)
    redis.call('DEL', hits)
    return { count, ttl, 1, blockDuration }
  end
  return { count, windowExpire(), 0, 0 }
end

local count = redis.call('ZCARD', hits)
if count >= limit then
  return { count + 1, windowExpire(), 1, windowExpire() }
end
redis.call('ZADD', hits, now, member)
redis.call('PEXPIRE', hits, ttl)
return { count + 1, windowExpire(), 0, 0 }
`;

/**
 * Хранилище лимитов в Redis: счётчики общие для всех экземпляров API.
 * При ошибке Redis запрос считается во встроенном хранилище процесса,
 * чтобы недоступный Redis не превращал каждый ответ в 500.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly instanceId = randomUUID();
  private sequence = 0;
  private degraded = false;

  constructor(
    private readonly redis: Redis,
    private readonly keyPrefix = 'throttler',
    private readonly fallback: ThrottlerStorage = new ThrottlerStorageService(),
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const base = `${this.keyPrefix}:${throttlerName}:${key}`;
    // Экземпляры в разных контейнерах могут иметь одинаковый PID.
    const member = `${this.instanceId}:${this.sequence++}`;
    // Во время переподключения не ждём Redis: каждый запрос получил бы
    // задержку на повторную попытку.
    if (this.redis.status === 'reconnecting' || this.redis.status === 'end') {
      return this.countLocally(key, ttl, limit, blockDuration, throttlerName);
    }
    try {
      const [totalHits, toExpire, blocked, toBlockExpire] =
        (await this.redis.eval(
          INCREMENT,
          2,
          `${base}:hits`,
          `${base}:block`,
          ttl,
          limit,
          blockDuration,
          member,
        )) as [number, number, number, number];
      if (this.degraded) {
        this.degraded = false;
        this.logger.log('Redis is back, limits are shared again');
      }
      return {
        totalHits,
        timeToExpire: Math.ceil(toExpire / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(toBlockExpire / 1000),
      };
    } catch {
      return this.countLocally(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  private countLocally(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    if (!this.degraded) {
      this.degraded = true;
      this.logger.warn('Redis is unavailable, counting in process memory');
    }
    return this.fallback.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttlerName,
    );
  }
}
