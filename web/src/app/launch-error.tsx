import { Result } from 'antd-mobile';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { telegramLaunchErrorReady } from '../common/telegram/telegram';
import '../styles.css';

export function showLaunchError(title: string, description?: string) {
  const container = document.getElementById('root');
  if (!container) return;

  const root = createRoot(container);
  flushSync(() => {
    root.render(
      <main>
        <Result
          status="error"
          title={<h1>{title}</h1>}
          description={description}
        />
      </main>,
    );
  });
  telegramLaunchErrorReady();
}
