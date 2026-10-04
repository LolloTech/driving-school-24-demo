import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvironment, basePath } from './environment.mjs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

test('prod overrides staging overrides dev per key; shell overrides files', () => {
  const root = mkdtempSync(join(tmpdir(), 'patente-env-'));
  try {
    writeFileSync(join(root, '.env.dev'), 'APP_HOST=localhost\nPORT=3000\nTOKEN=demo\n');
    assert.equal(loadEnvironment(root, {}).APP_HOST, 'localhost');
    writeFileSync(join(root, '.env.staging'), 'APP_HOST=staging.example.com\nTOKEN=staging\n');
    assert.equal(loadEnvironment(root, {}).TOKEN, 'staging');
    writeFileSync(join(root, '.env.prod'), 'APP_HOST=example.com\n');
    assert.deepEqual(loadEnvironment(root, { PORT: '4000' }), {
      APP_HOST: 'example.com', PORT: '4000', TOKEN: 'staging',
    });
    const script = `import sys,json;sys.path.insert(0,${JSON.stringify(resolve('scripts'))});from environment import load_environment;print(json.dumps(load_environment(${JSON.stringify(root)}, {'PORT':'4000'})))`;
    const python = process.platform === 'win32' ? 'python' : 'python3';
    assert.deepEqual(JSON.parse(execFileSync(python, ['-c', script], { encoding: 'utf8' })), loadEnvironment(root, { PORT: '4000' }));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('normalizes root/subpath and rejects unsafe path forms', () => {
  assert.equal(basePath('/'), '/');
  assert.equal(basePath('/driving24'), '/driving24/');
  assert.equal(basePath('/driving24/'), '/driving24/');
  for (const value of ['https://example.com', '/a/../b', '/a?b', '//external']) {
    assert.throws(() => basePath(value));
  }
});
