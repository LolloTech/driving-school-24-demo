#!/usr/bin/env bash
# Executed over SSH from the tested workflow checkout, not from mutable server code.
set -euo pipefail
umask 077

expected_sha="${1:?Pass the tested commit SHA}"
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit SHA.' >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || { echo 'Run deployment as the rootless deploy user, not root.' >&2; exit 1; }
project_dir="${DEPLOY_PROJECT_DIR:-/home/deploy/projects/driving-school-24-demo}"
repository='https://github.com/LolloTech/driving-school-24-demo.git'
for dependency in git podman flock sha256sum loginctl python3; do command -v "$dependency" >/dev/null; done
[[ "$(loginctl show-user "$(id -un)" -p Linger --value)" == yes ]] || {
  echo 'Enable lingering for deploy before deployment: sudo loginctl enable-linger deploy' >&2
  exit 1
}
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
podman compose version >/dev/null
[[ "$(podman info --format '{{.Host.Security.Rootless}}')" == true ]] || {
  echo 'Rootless Podman is required.' >&2; exit 1;
}
mkdir -p "$(dirname "$project_dir")"
exec 9>"$(dirname "$project_dir")/.patente-deploy.lock"
flock -n 9 || { echo 'Another deployment is already running.' >&2; exit 1; }
if [[ ! -e "$project_dir" ]]; then
  git clone --branch main "$repository" "$project_dir"
fi
cd "$project_dir"
[[ "$(git remote get-url origin)" == "$repository" ]] || {
  echo 'Unexpected repository origin; refusing deployment.' >&2; exit 1;
}
[[ "$(git branch --show-current)" == main ]] || {
  echo 'The deployment checkout must be on main.' >&2; exit 1;
}
env_file=.env.staging
[[ ! -e .env.prod ]] || env_file=.env.prod
[[ -f "$env_file" && ! -L "$env_file" ]] || {
  echo 'Create the server-local .env.staging or .env.prod before deploying.' >&2; exit 1;
}
if git ls-files --error-unmatch "$env_file" >/dev/null 2>&1; then
  echo 'Private environment must not be tracked by Git.' >&2; exit 1;
fi
git check-ignore -q "$env_file" || { echo 'Private environment must be ignored by Git.' >&2; exit 1; }
chmod 600 "$env_file"
env_hash="$(sha256sum "$env_file")"
git fetch origin main
[[ "$(git rev-parse origin/main)" == "$expected_sha" ]] || {
  echo 'main has changed since testing; let the workflow for the newer commit deploy.' >&2; exit 1;
}
stash_oid=''
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  git stash push -m "ci-deploy-$expected_sha"
  stash_oid="$(git rev-parse refs/stash)"
  echo "Local tracked changes saved in stash $stash_oid; retained for recovery."
fi
git pull --ff-only origin main
if [[ -n "$stash_oid" ]]; then
  git stash apply "$stash_oid" || {
    echo "Stash conflict: deployment stopped; changes remain in stash $stash_oid." >&2; exit 1;
  }
fi
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || {
  echo 'Checkout does not match the tested commit; deployment stopped.' >&2; exit 1;
}
[[ "$(sha256sum "$env_file")" == "$env_hash" ]] || {
  echo 'The server-local environment changed during the update; deployment stopped.' >&2; exit 1;
}
python3 scripts/environment.py >/dev/null
compose=(podman compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env)
# Validate required production settings before stopping any running containers.
"${compose[@]}" config --quiet
mkdir -p infra/runtime
chmod 700 infra/runtime

echo 'Building static frontend on the server.'
frontend_base="$(python3 -c 'from scripts.environment import load_environment; print(load_environment(".").get("VITE_BASE_PATH", "/"))')"
podman build --build-arg "VITE_BASE_PATH=$frontend_base" -t localhost/patente_frontend:latest -f infra/frontend/Dockerfile .
echo 'Removing application containers, keeping all persistent volumes.'
"${compose[@]}" down
echo 'Rebuilding and starting application services.'
"${compose[@]}" build
mkdir -p .deploy
if ! "${compose[@]}" up -d > .deploy/compose-start.log 2>&1; then
  echo 'Container startup failed. Inspect .deploy/compose-start.log over SSH; its private output is not printed in CI.' >&2
  exit 1
fi

healthy=false
for ((attempt=1; attempt<=30; attempt++)); do
  backend_id="$("${compose[@]}" ps -q backend)"
  if [[ -n "$backend_id" ]] && podman exec "$backend_id" wget -q -O /dev/null http://127.0.0.1:3000/health; then
    healthy=true
    break
  fi
  sleep 2
done
[[ "$healthy" == true ]] || {
  echo 'Backend health check failed. Inspect services on the server; no volumes were removed.' >&2
  "${compose[@]}" ps
  exit 1
}

frontend_id="$(podman create localhost/patente_frontend:latest /unused)"
trap 'podman rm "$frontend_id" >/dev/null 2>&1 || true' EXIT
mkdir -p dist
podman cp "$frontend_id:/dist/." dist/
[[ -s dist/index.html && -s dist/backoffice.html ]] || {
  echo 'Frontend build output is incomplete.' >&2; exit 1;
}
echo "Deployment healthy at commit $expected_sha. Static frontend: $project_dir/dist"
