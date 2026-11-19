type ErrorSource = 'render' | 'bootstrap' | 'window' | 'unhandledrejection';

const kinds = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
]);
let reports = 0;

/** Send only fixed categories. Error messages, stacks and launch data stay local. */
export function reportClientError(error: unknown, source: ErrorSource) {
  if (reports >= 5) return;
  reports += 1;
  const kind =
    error instanceof Error && kinds.has(error.name)
      ? error.name
      : 'UnknownError';
  const page =
    location.pathname === '/'
      ? 'home'
      : location.pathname === '/time'
        ? 'time'
        : 'other';
  try {
    void fetch('/api/v1/client-errors', {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, kind, page }),
      keepalive: true,
    }).catch(() => {
      // Reporting failures must not trigger another report.
    });
  } catch {
    // A restricted WebView can reject fetch synchronously.
  }
}

export function installErrorReporting() {
  window.addEventListener('error', (event) => {
    if (event instanceof ErrorEvent) reportClientError(event.error, 'window');
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, 'unhandledrejection');
  });
}
