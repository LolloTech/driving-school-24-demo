import { existsSync, readFileSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export function loadEnvironment(directory = process.cwd(), overrides = process.env) {
  const values = {};
  for (const name of ['.env.dev', '.env.staging', '.env.prod']) {
    const path = resolve(directory, name);
    if (existsSync(path)) Object.assign(values, parseEnv(readFileSync(path, 'utf8')));
  }
  return { ...values, ...overrides };
}
export function basePath(value = '/') {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*\/?$/.test(value)) {
    throw new Error('VITE_BASE_PATH must be an absolute path without query strings or traversal');
  }
  return value.replace(/\/+$/, '') + '/';
}

export function writeEnvironment(directory = process.cwd(), overrides = process.env) {
  const keys = Object.keys(loadEnvironment(directory, {}));
  if (!keys.length) throw new Error('No environment layers found in the project directory');
  const config = loadEnvironment(directory, overrides);
  const lines = keys.map(key => {
    const value = config[key];
    if (/[\n\r']/.test(value)) throw new Error(`Unsupported multiline/quoted environment value: ${key}`);
    return `${key}='${value}'`;
  });
  mkdirSync(resolve(directory, '.deploy'), { recursive: true, mode: 0o700 });
  const target = resolve(directory, '.deploy/environment.env');
  writeFileSync(target, lines.join('\n') + '\n', { mode: 0o600 });
  chmodSync(target, 0o600);
  return target;
}
