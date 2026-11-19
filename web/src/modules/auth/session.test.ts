import { afterEach, expect, test, vi } from 'vitest';
import {
  endSession,
  expireSession,
  getAccessToken,
  getSessionState,
  startSession,
} from './session';

afterEach(() => {
  endSession();
  vi.useRealTimers();
});

test('clears the token at the expiration deadline', () => {
  vi.useFakeTimers();
  startSession('first', 2);
  expect(getAccessToken()).toBe('first');
  vi.advanceTimersByTime(2000);
  expect(getAccessToken()).toBeUndefined();
  expect(getSessionState().status).toBe('expired');
});

test('does not clear a new token when a late 401 belongs to an older session', () => {
  startSession('old', 60);
  startSession('new', 60);
  expireSession('old');
  expect(getAccessToken()).toBe('new');
  expireSession('new');
  expect(getSessionState().status).toBe('expired');
});
