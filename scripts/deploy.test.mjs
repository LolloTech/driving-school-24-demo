import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = 'a'.repeat(40);
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const posix = (path) => process.platform === 'win32'
  ? path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
  : path;

function run(scenario) {
  const dir = mkdtempSync(resolve('.deploy-test-'));
  const bin = join(dir, 'bin');
  const project = join(dir, 'project');
  const journal = join(dir, 'commands');
  mkdirSync(bin);
  mkdirSync(project);
  if (scenario !== 'missing-env') writeFileSync(join(project, '.env.staging'), 'LOCAL_SECRET=preserve-me\n');
  writeFileSync(join(project, 'database-sentinel'), 'persistent data');
  const mock = (name, body) => writeFileSync(join(bin, name), `#!/usr/bin/env bash\nset -eu\nprintf '%s\\n' '${name} '"$*" >> "$TEST_JOURNAL"\n${body}\n`, { mode: 0o755 });
  mock('id', 'if [[ "$1" == -un ]]; then echo deploy; elif [[ "$TEST_SCENARIO" == root ]]; then echo 0; else echo 1001; fi');
  mock('loginctl', 'if [[ "$TEST_SCENARIO" == no-linger ]]; then echo no; else echo yes; fi');
  mock('flock', 'exit 0');
  mock('python3', 'if [[ \"$*\" == *-c* ]]; then echo /; fi');
  mock('sleep', 'exit 0');
  mock('git', `
case "$*" in
  'remote get-url origin') echo 'https://github.com/LolloTech/driving-school-24-demo.git' ;;
  'branch --show-current') echo main ;;
  'ls-files --error-unmatch .env.staging') [[ "$TEST_SCENARIO" == tracked-env ]] ;;
  'check-ignore -q .env.staging') exit 0 ;;
  'rev-parse origin/main')
    if [[ "$TEST_SCENARIO" == stale ]]; then echo '${'b'.repeat(40)}'; else echo '${sha}'; fi ;;
  'rev-parse HEAD')
    if [[ "$TEST_SCENARIO" == race ]]; then echo '${'b'.repeat(40)}'; else echo '${sha}'; fi ;;
  'rev-parse refs/stash') echo '${'c'.repeat(40)}' ;;
  'status --porcelain --untracked-files=no')
    if [[ "$TEST_SCENARIO" == dirty || "$TEST_SCENARIO" == conflict ]]; then echo ' M README.md'; fi ;;
  'pull --ff-only origin main')
    if [[ "$TEST_SCENARIO" == env-changed ]]; then echo changed > .env.staging; fi ;;
  'stash apply '*) [[ "$TEST_SCENARIO" != conflict ]] ;;
esac
exit 0
`);
  mock('podman', `
case "$*" in
  info*) echo true ;;
  *'config --quiet') [[ "$TEST_SCENARIO" != invalid-config ]] ;;
  *'label=com.docker.compose.service=backend') echo backend-test ;;
  *'label=com.docker.compose.service=frontend') echo frontend-service-test ;;
  'exec frontend-service-test '*) [[ "$TEST_SCENARIO" != frontend-unhealthy ]] ;;
  exec*) [[ "$TEST_SCENARIO" != unhealthy ]] ;;
  build*) [[ "$TEST_SCENARIO" != frontend-build-failed ]] ;;
  *'compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env build')
    [[ "$TEST_SCENARIO" != backend-build-failed ]] ;;
  create*) echo frontend-test ;;
  cp*) printf '<html>public</html>' > dist/index.html; printf '<html>backoffice</html>' > dist/backoffice.html ;;
esac
`);
  const result = spawnSync(bash, ['--noprofile', '--norc', '-c',
    'export PATH="$1:$PATH"; export DEPLOY_PROJECT_DIR="$2"; exec bash "$3" "$4"',
    'test', posix(bin), posix(project), posix(resolve('scripts/deploy.sh')), sha], {
    env: { ...process.env, TEST_SCENARIO: scenario, TEST_JOURNAL: posix(journal) },
    encoding: 'utf8', timeout: 15_000,
  });
  const commands = readFileSync(journal, 'utf8');
  return {
    result, commands, project,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const failureMessages = {
  'missing-env': /Create the server-local/, 'tracked-env': /must not be tracked/,
  stale: /main has changed/, race: /does not match/, conflict: /Stash conflict/,
  'env-changed': /changed during the update/,
  'no-linger': /Enable lingering/,
};
for (const scenario of ['missing-env', 'tracked-env', 'stale', 'race', 'conflict', 'env-changed', 'invalid-config', 'frontend-build-failed', 'no-linger']) {
  test(`${scenario}: refuses deployment before stopping existing containers`, () => {
    const fixture = run(scenario);
    try {
      assert.equal(fixture.result.status, 1, fixture.result.stderr);
      if (failureMessages[scenario]) assert.match(fixture.result.stderr, failureMessages[scenario]);
      if (scenario === 'invalid-config') assert.match(fixture.commands, /config --quiet/);
      if (scenario === 'frontend-build-failed') assert.match(fixture.commands, /podman build /);
      assert.doesNotMatch(fixture.commands, /podman compose .* down/);
    } finally { fixture.cleanup(); }
  });
}

test('successful deployment preserves environment/data and performs down, build, up, health in order', () => {
  const fixture = run('dirty');
  try {
    assert.equal(fixture.result.status, 0, fixture.result.stderr);
    assert.equal(readFileSync(join(fixture.project, '.env.staging'), 'utf8'), 'LOCAL_SECRET=preserve-me\n');
    assert.equal(readFileSync(join(fixture.project, 'database-sentinel'), 'utf8'), 'persistent data');
    assert.match(fixture.commands, /git stash push/);
    assert.match(fixture.commands, /git stash apply c{40}/);
    assert.doesNotMatch(fixture.commands, /(?:--volumes|--force|reset --hard)/);
    const down = fixture.commands.indexOf('compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env down');
    const build = fixture.commands.indexOf('compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env build');
    const up = fixture.commands.indexOf('compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env up -d');
    const health = fixture.commands.indexOf('podman exec backend-test');
    assert.ok(down >= 0 && build > down && up > build && health > up);
    assert.match(fixture.commands, /exec frontend-service-test.*__frontend_health/);
    assert.match(fixture.commands, /podman ps -q --filter label=com.docker.compose.project=patente --filter label=com.docker.compose.service=backend/);
    assert.doesNotMatch(fixture.commands, /compose .* ps -q/);
    assert.ok(readFileSync(join(fixture.project, 'dist/backoffice.html'), 'utf8'));
  } finally { fixture.cleanup(); }
});

for (const scenario of ['backend-build-failed', 'unhealthy', 'frontend-unhealthy']) {
  test(`${scenario}: fails the deployment without deleting volumes`, () => {
    const fixture = run(scenario);
    try {
      assert.equal(fixture.result.status, 1, fixture.result.stderr);
      assert.match(fixture.commands, /compose .* down/);
      if (scenario.endsWith('unhealthy')) assert.match(fixture.result.stderr, /health check failed/);
      assert.doesNotMatch(fixture.commands, /--volumes/);
      assert.doesNotMatch(fixture.commands, /podman cp /);
    } finally { fixture.cleanup(); }
  });
}

test('root execution is refused', () => {
  const fixture = run('root');
  try {
    assert.equal(fixture.result.status, 1);
    assert.match(fixture.result.stderr, /not root/);
    assert.doesNotMatch(fixture.commands, /podman /);
  } finally { fixture.cleanup(); }
});
