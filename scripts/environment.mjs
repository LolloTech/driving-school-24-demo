import { existsSync, readFileSync } from 'node:fs';
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
