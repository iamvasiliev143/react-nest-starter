import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setupProject } from './setup.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'starter-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(['api', 'web'].map((name) => mkdir(join(root, name))));
  const packages = {
    '': { name: 'starter', version: '0.1.0', workspaces: ['api', 'web'] },
    api: { name: 'starter-api', version: '0.1.0' },
    web: { name: 'starter-web', version: '0.1.0' },
  };
  for (const [directory, manifest] of Object.entries(packages)) {
    await writeFile(
      join(root, directory, 'package.json'),
      JSON.stringify(manifest),
    );
  }
  await writeFile(
    join(root, 'package-lock.json'),
    JSON.stringify({
      name: 'starter',
      lockfileVersion: 3,
      packages: {
        ...packages,
        'node_modules/starter-api': { resolved: 'api', link: true },
        'node_modules/starter-web': { resolved: 'web', link: true },
      },
    }),
  );
  await writeFile(
    join(root, 'api/.env.example'),
    'TELEGRAM_BOT_TOKEN=\nAUTH_TOKEN_SECRET=\n',
  );
  await writeFile(
    join(root, '.env.example'),
    'MCP_DATABASE_URI=postgresql://fixture/example\nGITHUB_PERSONAL_ACCESS_TOKEN=\n',
  );
  return root;
}

test('setup synchronizes workspace names and links and preserves existing credentials on retry', async (t) => {
  const root = await fixture(t);
  const initial = await setupProject(root, {
    name: 'my-project',
    botToken: '123:test-token',
  });
  assert.equal(initial.createdEnv, true);
  assert.equal(initial.createdMcpEnv, true);
  const mcpEnv =
    'MCP_DATABASE_URI=postgresql://custom/existing\nGITHUB_PERSONAL_ACCESS_TOKEN=existing-token\n';
  await writeFile(join(root, '.env'), mcpEnv);
  assert.equal(initial.environment.TELEGRAM_BOT_TOKEN, '123:test-token');
  assert.match(initial.environment.AUTH_TOKEN_SECRET, /^[a-f0-9]{96}$/);
  const env = await readFile(join(root, 'api/.env'), 'utf8');
  const lock = JSON.parse(
    await readFile(join(root, 'package-lock.json'), 'utf8'),
  );
  for (const [workspace, name] of [
    ['', 'my-project'],
    ['api', 'my-project-api'],
    ['web', 'my-project-web'],
  ]) {
    const manifest = JSON.parse(
      await readFile(join(root, workspace, 'package.json'), 'utf8'),
    );
    assert.equal(manifest.name, name);
    assert.equal(lock.packages[workspace].name, name);
    if (workspace)
      assert.deepEqual(lock.packages['node_modules/' + name], {
        resolved: workspace,
        link: true,
      });
  }
  assert.equal(lock.packages['node_modules/starter-api'], undefined);
  assert.equal(lock.packages['node_modules/starter-web'], undefined);
  const second = await setupProject(root, {
    name: 'my-project',
    botToken: '456:different-token',
  });
  assert.equal(second.createdEnv, false);
  assert.equal(second.createdMcpEnv, false);
  assert.equal(await readFile(join(root, '.env'), 'utf8'), mcpEnv);
  assert.equal(await readFile(join(root, 'api/.env'), 'utf8'), env);
});

test('setup leaves Telegram disabled without a token and rejects unsafe names before writing', async (t) => {
  const root = await fixture(t);
  const before = await readFile(join(root, 'package.json'), 'utf8');
  await assert.rejects(setupProject(root, { name: '../escape' }));
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), before);
  const result = await setupProject(root);
  assert.equal(result.environment.TELEGRAM_BOT_TOKEN, '');
  assert.equal(result.environment.AUTH_TOKEN_SECRET, '');
});
