import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import test from 'node:test';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'starter-claude-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts'));
  await copyFile(
    new URL('./claude.mjs', import.meta.url),
    join(root, 'scripts/claude.mjs'),
  );
  const output = join(root, 'captured.json');
  const recorder = join(root, 'npm-recorder.mjs');
  await writeFile(
    recorder,
    "import { writeFileSync } from 'node:fs';\nwriteFileSync(process.env.TEST_CLAUDE_OUTPUT, JSON.stringify({\nargs:process.argv.slice(2),cwd:process.cwd(),uri:process.env.MCP_DATABASE_URI,token:process.env.GITHUB_PERSONAL_ACCESS_TOKEN,\n}));\nprocess.exitCode=Number(process.env.TEST_CLAUDE_EXIT||0);\n",
  );
  const env = {
    ...process.env,
    npm_execpath: recorder,
    TEST_CLAUDE_OUTPUT: output,
  };
  delete env.MCP_DATABASE_URI;
  delete env.GITHUB_PERSONAL_ACCESS_TOKEN;
  return { root, output, env };
}

test('Claude launcher passes root env and arguments through npm with shell env priority', async (t) => {
  const { root, output, env } = await fixture(t);
  await writeFile(
    join(root, '.env'),
    'MCP_DATABASE_URI=postgresql://file/example\nGITHUB_PERSONAL_ACCESS_TOKEN=file-token\n',
  );
  const args = [
    join(root, 'scripts/claude.mjs'),
    '--agent',
    'tech-lead',
    '--prompt',
    'value with spaces & symbols',
  ];
  const first = spawnSync(process.execPath, args, { env, encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), {
    args: ['run', 'ai:claude:exec', '--', ...args.slice(1)],
    cwd: root,
    uri: 'postgresql://file/example',
    token: 'file-token',
  });
  const second = spawnSync(process.execPath, args, {
    env: {
      ...env,
      MCP_DATABASE_URI: 'postgresql://shell/example',
      GITHUB_PERSONAL_ACCESS_TOKEN: 'shell-token',
      TEST_CLAUDE_EXIT: '7',
    },
    encoding: 'utf8',
  });
  assert.equal(second.status, 7, second.stderr);
  const captured = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(captured.uri, 'postgresql://shell/example');
  assert.equal(captured.token, 'shell-token');
});

test('Claude launcher works without env file and explains direct invocation without npm', async (t) => {
  const { root, output, env } = await fixture(t);
  const launcher = join(root, 'scripts/claude.mjs');
  const first = spawnSync(process.execPath, [launcher], {
    env,
    encoding: 'utf8',
  });
  assert.equal(first.status, 0, first.stderr);
  const captured = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(captured.uri, undefined);
  const directEnv = { ...env };
  delete directEnv.npm_execpath;
  const direct = spawnSync(process.execPath, [launcher], {
    env: directEnv,
    encoding: 'utf8',
  });
  assert.equal(direct.status, 1);
  assert.match(direct.stderr, /npm run ai:claude/);
});

test('PostgreSQL MCP reads the URI from environment instead of Docker arguments', async () => {
  const config = JSON.parse(
    await readFile(new URL('../.mcp.json', import.meta.url), 'utf8'),
  );
  const postgres = config.mcpServers.postgres;
  assert.equal(postgres.env.DATABASE_URI, '${MCP_DATABASE_URI}');
  const envIndex = postgres.args.indexOf('-e');
  assert.ok(envIndex >= 0);
  assert.equal(postgres.args[envIndex + 1], 'DATABASE_URI');
  assert.ok(postgres.args.every((value) => !value.includes('postgresql://')));
});
