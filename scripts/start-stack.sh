#!/usr/bin/env bash
# Manual startup or ExecStart for systemd; run as the existing rootless owner.
set -euo pipefail
umask 077
[[ "$(id -u)" != 0 ]] || { echo 'Run as deploy, not root.' >&2; exit 1; }
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
mkdir -p .deploy

# Use host Node if installed, otherwise the Node image already used by builds.
# The temporary container exits immediately and requires no host Node/Python.
if command -v node >/dev/null; then
  node scripts/write-environment.mjs
else
  podman run --rm --pull=never --network none --read-only \
    --volume "$PWD:/workspace:ro" \
    --volume "$PWD/.deploy:/workspace/.deploy:rw" \
    --workdir /workspace docker.io/library/node:24-alpine \
    node scripts/write-environment.mjs
fi

compose=(podman compose -p patente -f compose.yaml -f compose.limits.yaml \
  --env-file .deploy/environment.env)
"${compose[@]}" config --quiet
if ! "${compose[@]}" up -d --no-build > .deploy/start-stack.log 2>&1; then
  echo 'Startup failed. Inspect the private .deploy/start-stack.log.' >&2
  exit 1
fi
echo 'Compose startup completed. Check container health with podman ps.'
