import process from 'node:process';
import console from 'node:console';
import { randomBytes } from 'node:crypto';
import {
  mkdtemp,
  readFile,
  rename,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function createEnvFile(path, contents) {
  try {
    await writeFile(path, contents, { flag: 'wx', mode: 0o600 });
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return false;
  }
}

async function replaceEnvFile(path, contents) {
  const temporaryDirectory = await mkdtemp(
    resolve(dirname(path), '.env.setup-'),
  );
  const temporaryFile = resolve(temporaryDirectory, '.env');
  try {
    await createEnvFile(temporaryFile, contents);
    await rename(temporaryFile, path);
  } finally {
    await unlink(temporaryFile).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    await rmdir(temporaryDirectory);
  }
}

function configureMiniAppEnv(contents, template, ngrokDomain) {
  const environment = parseEnv(contents);
  const defaults = parseEnv(template);
  const domain = ngrokDomain?.trim().toLowerCase() ?? '';
  const url = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)
    ? `https://${domain}`
    : '';
  const keys = [
    'TELEGRAM_MINI_APP_URL',
    'TELEGRAM_MINI_APP_BUTTON_TEXT',
    'TELEGRAM_MINI_APP_SIZE',
  ];
  const missing = keys.filter((key) => !Object.hasOwn(environment, key));
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  let updated = contents;
  if (url && environment.TELEGRAM_MINI_APP_URL === '') {
    updated = updated.replace(
      /^([\t ]*(?:export[\t ]+)?TELEGRAM_MINI_APP_URL[\t ]*=)[^\r\n]*/m,
      (_, prefix) => prefix + url,
    );
  }
  if (missing.length) {
    const lines = missing.map((key) => {
      const value = key === 'TELEGRAM_MINI_APP_URL' ? url : defaults[key];
      return `${key}=${value ? JSON.stringify(value) : ''}`;
    });
    updated = [updated, '# Кнопка меню Telegram Mini App', ...lines, ''].join(
      newline,
    );
  }
  return updated;
}

export async function setupProject(root, { name, botToken, ngrokDomain } = {}) {
  if (name && !/^[a-z][a-z0-9-]{0,69}$/.test(name)) {
    throw new Error(
      'Имя должно начинаться с a-z и содержать до 70 символов a-z, 0-9 или дефис.',
    );
  }
  if (botToken && /[\r\n]/.test(botToken)) {
    throw new Error('Токен Telegram содержит перенос строки.');
  }
  const paths = ['package.json', 'api/package.json', 'web/package.json'];
  const manifests = await Promise.all(
    paths.map((path) => readJson(resolve(root, path))),
  );
  const lock = await readJson(resolve(root, 'package-lock.json'));
  if (
    lock.lockfileVersion !== 3 ||
    !lock.packages?.[''] ||
    !lock.packages.api ||
    !lock.packages.web
  ) {
    throw new Error('Ожидается npm lockfile v3 с workspaces api и web.');
  }

  const [apiTemplate, webTemplate, mcpTemplate] = await Promise.all(
    ['api/.env.example', 'web/.env.example', '.env.example'].map((path) =>
      readFile(resolve(root, path), 'utf8'),
    ),
  );

  if (name) {
    const names = [name, name + '-api', name + '-web'];
    const workspaces = ['', 'api', 'web'];
    for (const [index, workspace] of workspaces.entries()) {
      const manifest = manifests[index];
      if (workspace) {
        const oldLink = 'node_modules/' + manifest.name;
        const newLink = 'node_modules/' + names[index];
        if (lock.packages[newLink] && newLink !== oldLink) {
          throw new Error('Имя workspace уже занято в lockfile.');
        }
        delete lock.packages[oldLink];
        lock.packages[newLink] = { resolved: workspace, link: true };
      }
      manifest.name = names[index];
      lock.packages[workspace].name = names[index];
    }
    lock.name = name;
    const updates = [...manifests, lock];
    const files = [...paths, 'package-lock.json'];
    const originals = await Promise.all(
      files.map((file) => readFile(resolve(root, file), 'utf8')),
    );
    try {
      for (const [index, file] of files.entries()) {
        await writeFile(
          resolve(root, file),
          JSON.stringify(updates[index], null, 2) + '\n',
        );
      }
    } catch (error) {
      await Promise.all(
        files.map((file, index) =>
          writeFile(resolve(root, file), originals[index]),
        ),
      );
      throw error;
    }
  }

  const envPath = resolve(root, 'api/.env');
  let template = apiTemplate;
  if (botToken) {
    template = template.replace(
      /^TELEGRAM_BOT_TOKEN=.*$/m,
      () => 'TELEGRAM_BOT_TOKEN=' + JSON.stringify(botToken),
    );
    template = template.replace(
      /^AUTH_TOKEN_SECRET=.*$/m,
      () => 'AUTH_TOKEN_SECRET=' + randomBytes(48).toString('hex'),
    );
  }
  const webEnvPath = resolve(root, 'web/.env');
  const createdWebEnv = await createEnvFile(webEnvPath, webTemplate);
  const { NGROK_DOMAIN } = parseEnv(await readFile(webEnvPath, 'utf8'));
  const tunnelDomain = ngrokDomain ?? NGROK_DOMAIN;
  const createdEnv = await createEnvFile(
    envPath,
    configureMiniAppEnv(template, apiTemplate, tunnelDomain),
  );
  const existingEnv = await readFile(envPath, 'utf8');
  const updatedEnv = configureMiniAppEnv(
    existingEnv,
    apiTemplate,
    tunnelDomain,
  );
  if (updatedEnv !== existingEnv) await replaceEnvFile(envPath, updatedEnv);
  const createdMcpEnv = await createEnvFile(resolve(root, '.env'), mcpTemplate);
  return {
    createdEnv,
    createdWebEnv,
    createdMcpEnv,
    environment: parseEnv(updatedEnv),
  };
}

function checkPort(rawUrl, defaultPort) {
  return new Promise((resolveCheck) => {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      resolveCheck(false);
      return;
    }
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port || defaultPort),
    });
    const finish = (available) => {
      socket.destroy();
      resolveCheck(available);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function commandAvailable(command) {
  try {
    const executable =
      process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
    // npm.cmd needs cmd.exe on Windows. Only fixed command names reach this function.
    const output = execFileSync(
      process.platform === 'win32' && command === 'npm'
        ? 'cmd.exe'
        : executable,
      process.platform === 'win32' && command === 'npm'
        ? ['/d', '/s', '/c', 'npm --version']
        : ['--version'],
      { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    console.log(output.trim());
    return true;
  } catch {
    console.warn(command + ' недоступен.');
    return false;
  }
}

async function main() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13))
    throw new Error('Нужен Node.js 22.13 или новее.');
  const { values } = parseArgs({ options: { name: { type: 'string' } } });
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { createdEnv, createdWebEnv, createdMcpEnv, environment } =
    await setupProject(root, {
      name: values.name,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      ngrokDomain: process.env.NGROK_DOMAIN,
    });
  console.log(
    values.name
      ? 'Имена пакетов и lockfile обновлены.'
      : 'Используются текущие имена пакетов.',
  );
  console.log(
    createdEnv ? 'api/.env создан.' : 'Используется существующий api/.env.',
  );
  console.log(
    createdWebEnv ? 'web/.env создан.' : 'Используется существующий web/.env.',
  );
  console.log(
    createdMcpEnv
      ? '.env для MCP создан.'
      : 'Используется существующий .env для MCP.',
  );
  console.log('Node.js ' + process.versions.node);
  commandAvailable('npm');
  commandAvailable('docker');
  const checks = [
    ['PostgreSQL', environment.DATABASE_URL, 5432],
    ['Redis', environment.REDIS_URL, 6379],
    [
      'S3',
      environment.S3_ENDPOINT || 'https://s3.amazonaws.com',
      environment.S3_ENDPOINT?.startsWith('http:') ? 80 : 443,
    ],
  ];
  await Promise.all(
    checks.map(async ([label, url, port]) => {
      console.log(
        label +
          ((await checkPort(url, port))
            ? ' — TCP-порт доступен.'
            : ' — TCP-порт недоступен.'),
      );
    }),
  );
  if (!environment.TELEGRAM_BOT_TOKEN || !environment.AUTH_TOKEN_SECRET) {
    console.log(
      'Для Telegram настройте в api/.env пару TELEGRAM_BOT_TOKEN и AUTH_TOKEN_SECRET (минимум 32 символа).',
    );
  }
  console.log(
    'Далее выполните npm ci, npm run hooks:install и команды запуска из README.',
  );
  console.log(
    'TCP-проверки подтверждают доступность порта. Readiness API проверяет работу хранилищ.',
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Ошибка настройки проекта.',
    );
    process.exitCode = 1;
  });
}
