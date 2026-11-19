import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { sign } from '@tma.js/init-data-node';
import { io } from 'socket.io-client';
import { prepareTestServices } from './support/environment.mjs';

const socketOptions = {
  autoConnect: false,
  path: '/api/socket.io',
  reconnection: false,
  transports: ['websocket'],
};

test(
  'authenticates the realtime namespace and relays events through Redis',
  { timeout: 15_000 },
  async () => {
    const botToken = '123456:realtime-fixture-token';
    Object.assign(process.env, await prepareTestServices(), {
      NODE_ENV: 'test',
      TELEGRAM_BOT_TOKEN: botToken,
      AUTH_TOKEN_SECRET: 'realtime-example-secret-used-by-tests-only',
      OBSERVE_APP_KEY: '',
      OBSERVE_APP_SECRET: '',
      REALTIME_CHANNEL: 'realtime-test:' + randomUUID(),
    });

    const { createApp } = await import('../dist/create-app.js');
    const { RealtimeGateway } =
      await import('../dist/modules/realtime/realtime.gateway.js');
    const first = await createApp({ docs: false });
    let second;
    let guest;
    let client;

    try {
      await first.listen(0, '127.0.0.1');
      const base = await first.getUrl();
      guest = io(base + '/realtime', socketOptions);
      const denied = once(guest, 'connect_error');
      guest.connect();
      const [denial] = await denied;
      assert.equal(denial.message, 'Unauthorized');
      guest.disconnect();

      const initData = sign(
        { user: { id: randomInt(1, 2_000_000_000), first_name: 'Realtime' } },
        botToken,
        new Date(),
      );
      const login = await fetch(base + '/api/v1/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      assert.equal(login.status, 200);
      const { accessToken } = await login.json();

      second = await createApp({ docs: false });
      await second.listen(0, '127.0.0.1');
      client = io((await second.getUrl()) + '/realtime', {
        ...socketOptions,
        auth: { token: accessToken },
      });
      const connected = once(client, 'connect');
      client.connect();
      await connected;

      const { namespace } = first.get(RealtimeGateway);
      let replicas = 0;
      for (let attempt = 0; attempt < 60 && replicas !== 2; attempt += 1) {
        replicas = await namespace.adapter.serverCount().catch(() => 0);
        if (replicas !== 2) await delay(50);
      }
      assert.equal(replicas, 2);

      const relay = once(client, 'test:relayed');
      namespace.emit('test:relayed', 'from-first-replica');
      assert.deepEqual(await relay, ['from-first-replica']);
    } finally {
      guest?.disconnect();
      client?.disconnect();
      await Promise.all([first.close(), second?.close()]);
    }
  },
);
