import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, basename, dirname, delimiter } from 'node:path';
import { loadEnvironment } from './environment.mjs';

const config = loadEnvironment();
mkdirSync('.deploy', { recursive: true, mode: 0o700 });
const keys = Object.keys(loadEnvironment(process.cwd(), {}));
const lines = keys.map(key => {
  const value = config[key];
  if (/[\n\r']/.test(value)) throw new Error(`Unsupported multiline/quoted environment value: ${key}`);
  return `${key}='${value}'`;
});
writeFileSync('.deploy/environment.env', lines.join('\n') + '\n', { mode: 0o600 });
const podman = process.env.PODMAN_BINARY ?? (process.platform === 'win32'
  ? resolve(process.env.LOCALAPPDATA, 'Programs/Podman/podman.exe') : 'podman');
const provider = process.env.PODMAN_COMPOSE_PROVIDER;
const directProvider = process.platform === 'win32' && provider && basename(provider).includes('podman-compose');
const prefix = directProvider
  ? ['--podman-path', podman, '--in-pod=false', '--podman-run-args=--cgroups=disabled']
  : ['compose'];
const result = spawnSync(directProvider ? provider : podman, [
  ...prefix, '-p', process.env.COMPOSE_PROJECT_NAME ?? 'patente',
  '-f', 'compose.yaml', '--env-file', '.deploy/environment.env', ...process.argv.slice(2),
], { stdio: 'inherit', env: { ...process.env, PATH: `${dirname(podman)}${delimiter}${process.env.PATH ?? ''}` } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
