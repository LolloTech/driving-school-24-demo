import { spawnSync } from 'node:child_process';
import { resolve, basename, dirname, delimiter } from 'node:path';
import { writeEnvironment } from './environment.mjs';

writeEnvironment();
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
