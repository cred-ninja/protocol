import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const guard = fileURLToPath(new URL('./public-leak-guard.sh', import.meta.url));
function fixture(files, check) {
  const dir = mkdtempSync(join(tmpdir(), 'cred-protocol-guard-'));
  const env = {
    PATH: process.env.PATH, HOME: dir, RUNNER_TEMP: dir, TMPDIR: dir,
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    PRIVATE_MARKERS: 'blocked-fixture',
  };
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
  };
  const run = (mode = 'files', extra = {}) => {
    const result = spawnSync('bash', [guard, mode], { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  };
  const stub = (name, body) => {
    const bin = join(dir, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    return `${bin}:${env.PATH}`;
  };
  try {
    git('init', '-q');
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
      git('--literal-pathspecs', 'add', '--', path);
    }
    check({ dir, run, stub });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('clean tracked source passes', () => fixture({ 'README.md': 'ordinary source' }, ({ run }) => {
  assert.equal(run().status, 0);
}));

test('a literal dash file cannot consume later inventory records', () => fixture({ '-': '', 'reports/item.md': 'ordinary source' }, ({ run }) => {
  assert.notEqual(run().status, 0);
}));
test('a literal dash file is scanned as a file, not stdin', () => fixture({ '-': 'blocked-fixture' }, ({ run }) => {
  assert.notEqual(run().status, 0);
}));

for (const path of ['docs/é.txt', 'docs/tab\tfile.txt', 'docs/line\nfile.txt', '--notes.md', '::error::fixture.md']) {
  test(`real Git inventory scans literal filename ${JSON.stringify(path)}`, () => fixture({ [path]: 'blocked-fixture' }, ({ run }) => {
    const result = run();
    assert.notEqual(result.status, 0);
    assert.ok(!result.stdout.includes('blocked-fixture'), 'Do not print matching content');
    assert.ok(!result.stdout.split('\n').some((line) => line.startsWith('::')));
  }));
}
for (const path of ['reports/item.md', 'docs/Reports/item.md']) {
  test(`register path is refused: ${path}`, () => fixture({ [path]: 'ordinary source' }, ({ run }) => {
    assert.notEqual(run().status, 0);
  }));
}

test('grep errors are not clean files', () => fixture({ 'README.md': 'ordinary source' }, ({ run, stub }) => {
  assert.notEqual(run('files', { PATH: stub('grep', 'exit 2') }).status, 0);
}));
test('Git inventory errors fail closed', () => fixture({ 'README.md': 'ordinary source' }, ({ run, stub }) => {
  assert.notEqual(run('files', { PATH: stub('git', 'exit 27') }).status, 0);
}));
test('missing tracked source fails closed', () => fixture({ 'README.md': 'ordinary source' }, ({ dir, run }) => {
  unlinkSync(join(dir, 'README.md'));
  assert.notEqual(run().status, 0);
}));

const prEnv = { BASE_SHA: 'base', HEAD_SHA: 'head', PR_TITLE: 'ordinary title', PR_BODY: 'ordinary body' };
test('clean PR and commit text passes', () => fixture({}, ({ run, stub }) => {
  assert.equal(run('pr', { ...prEnv, PATH: stub('git', "printf '%s\\n' 'ordinary commit'") }).status, 0);
}));
test('PR markers are refused without printing content', () => fixture({}, ({ run, stub }) => {
  const result = run('pr', { ...prEnv, PR_TITLE: 'blocked-fixture', PATH: stub('git', "printf '%s\\n' 'ordinary commit'") });
  assert.notEqual(result.status, 0);
  assert.ok(!result.stdout.includes('blocked-fixture'));
}));
test('commit markers are refused', () => fixture({}, ({ run, stub }) => {
  assert.notEqual(run('pr', { ...prEnv, PATH: stub('git', "printf '%s\\n' 'blocked-fixture'") }).status, 0);
}));
test('failed git log is not a clean commit scan', () => fixture({}, ({ run, stub }) => {
  assert.notEqual(run('pr', { ...prEnv, PATH: stub('git', 'exit 27') }).status, 0);
}));
test('PR scanner errors fail closed', () => fixture({}, ({ run, stub }) => {
  stub('git', "printf '%s\\n' 'ordinary commit'");
  assert.notEqual(run('pr', { ...prEnv, PATH: stub('grep', 'exit 2') }).status, 0);
}));
