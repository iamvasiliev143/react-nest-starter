import process from 'node:process';
import console from 'node:console';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = resolve(root, '.env');
if (existsSync(envFile)) loadEnvFile(envFile);

const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Запусти Claude командой npm run ai:claude.');
  process.exitCode = 1;
} else {
  const child = spawn(
    process.execPath,
    [npm, 'run', 'ai:claude:exec', '--', ...process.argv.slice(2)],
    { cwd: root, stdio: 'inherit', env: process.env },
  );
  child.on('error', () => {
    console.error('Не удалось запустить Claude через npm.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}
