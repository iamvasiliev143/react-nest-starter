import { ClientError } from './client-error';

type Session = {
  accessToken: string;
  expiresAt: number;
  id: number;
};

type SessionState =
  { status: 'anonymous' | 'expired' } | { status: 'active'; session: Session };

let state: SessionState = { status: 'anonymous' };
let timer: ReturnType<typeof setTimeout> | undefined;
let id = 0;
const listeners = new Set<() => void>();

function publish(next: SessionState) {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeToSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionState() {
  return state;
}

export function startSession(accessToken: string, expiresIn: number) {
  const ttl = expiresIn * 1000;
  if (
    !accessToken ||
    !Number.isFinite(ttl) ||
    ttl <= 0 ||
    ttl > 2_147_483_647
  ) {
    throw new ClientError('errors:invalidSession');
  }
  publish({
    status: 'active',
    session: { accessToken, expiresAt: Date.now() + ttl, id: ++id },
  });
  timer = setTimeout(() => expireSession(accessToken), ttl);
}

export function expireSession(accessToken: string) {
  if (state.status === 'active' && state.session.accessToken === accessToken) {
    publish({ status: 'expired' });
  }
}

export function endSession() {
  publish({ status: 'anonymous' });
}

export function getAccessToken() {
  if (state.status !== 'active') return undefined;
  const { accessToken, expiresAt } = state.session;
  if (Date.now() >= expiresAt) {
    expireSession(accessToken);
    return undefined;
  }
  return accessToken;
}
