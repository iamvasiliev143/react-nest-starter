import { Component, type ReactNode } from 'react';
import { reportClientError } from './error-reporting';

type RecoveryLabels = { title: string; description: string; reload: string };

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
  { children: ReactNode; labels: RecoveryLabels },
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
    return this.state.failed ? (
      <RecoveryScreen labels={this.props.labels} />
    ) : (
      this.props.children
    );
  }
}
