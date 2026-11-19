import { WsAuthenticator } from '@nestjs/authentication';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

type RealtimeSocket = Socket<
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  { expiresAt: number }
>;

@WebSocketGateway({
  path: '/api/socket.io',
  namespace: '/realtime',
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  namespace!: Namespace;

  constructor(private readonly auth: WsAuthenticator) {}

  afterInit(namespace: Namespace): void {
    namespace.use((socket: RealtimeSocket, next) => {
      void this.authenticate(socket).then(
        (authorized) =>
          next(authorized ? undefined : new Error('Unauthorized')),
        () => next(new Error('Unauthorized')),
      );
    });
  }

  handleConnection(socket: RealtimeSocket): void {
    const remaining = socket.data.expiresAt - Date.now();
    if (remaining <= 0) {
      socket.disconnect(true);
      return;
    }

    const timer = setTimeout(() => socket.disconnect(true), remaining);
    timer.unref();
    socket.once('disconnect', () => clearTimeout(timer));
  }

  private async authenticate(socket: RealtimeSocket): Promise<boolean> {
    const result = await this.auth.authenticateConnection(socket, undefined, {
      required: false,
    });
    const session = result?.session;
    const exp =
      session && typeof session === 'object' && 'exp' in session
        ? session.exp
        : undefined;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;

    socket.data.expiresAt = exp * 1000;
    return socket.data.expiresAt > Date.now();
  }
}
