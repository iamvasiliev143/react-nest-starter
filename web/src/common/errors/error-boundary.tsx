import { Component, type ReactNode } from 'react';
import { reportClientError } from './error-reporting';

type RecoveryLabels = { title: string; description: string; reload: string };
type ErrorBoundaryProps = { children: ReactNode } & (
  { labels: RecoveryLabels } | { fallback: ReactNode }
);

export function RecoveryScreen({ labels }: { labels: RecoveryLabels }) {
  return (
    <main>
      <section role="alert">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
        <button type="button" onClick={() => window.location.reload()}>
          {labels.reload}
        </button>
      </section>
    </main>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, 'render');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if ('fallback' in this.props) return this.props.fallback;
    return <RecoveryScreen labels={this.props.labels} />;
  }
}
