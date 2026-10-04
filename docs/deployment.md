# CI and deployment

The `CI and deployment` workflow runs backend build/unit/integration tests and frontend build/React tests as two parallel jobs. Pull requests only run tests. Successful pushes to `main` (or manual runs on `main`) deploy over SSH. Only one deployment runs at a time.

## GitHub secrets

Set these repository Actions secrets yourself:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | `ec2-16-170-231-62.eu-north-1.compute.amazonaws.com` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Complete private key contents, including BEGIN/END lines; not its filename |
| `DEPLOY_KNOWN_HOSTS` | The verified server host-key line from Windows `known_hosts` |

The host key is stable across normal reboots. Verify any replacement before updating the secret. The workflow requires strict host verification, does not print private keys, and has read-only repository permissions.

## Server preparation

Git, Python 3, rootless Podman, and a Compose provider are required. All containers belong to `deploy`, not `ubuntu` or root. The administrator installs the provider system-wide with `sudo apt install podman-compose`. Rootless UID/GID mappings must be configured by the administrator. On this EC2 host the user manager stops containers when the SSH session ends unless lingering is enabled; the administrator must run `sudo loginctl enable-linger deploy`. Deployment checks this prerequisite before stopping any containers.

Clone location:

```sh
git clone https://github.com/LolloTech/driving-school-24-demo.git /home/deploy/projects/driving-school-24-demo
```

Create `/home/deploy/projects/driving-school-24-demo/.env.staging` from `.env.example` with permissions `600`. Set your public Cloudflare application/authentication HTTPS origins and common cookie domain. Generate each application secret independently with `openssl rand -hex 32`. Do not commit `.env.staging`; deployments never replace it. The repository is public, so Git pulls need no GitHub credentials on this host.

The first container startup provisions a random administrator password in `infra/runtime/admin-credentials.txt` on the server. Read it over your trusted SSH connection; it is never printed in the pipeline. Existing identities and passwords are preserved on later deployments. Demo quiz seeding is optional and is not run by deployment.

## Environment layers and subpath hosting

The application resolves keys in `.env.dev`, then `.env.staging`, then `.env.prod`: production overrides staging, staging overrides dev, and explicit process environment overrides files. Missing files are skipped. The legacy `.env` is deliberately not loaded. Do not leave a production file on a staging machine. The same key set belongs in each environment; only dev is committed, with public demonstration secrets. Vite exposes only its base path and optional `VITE_API_URL`, never authentication secrets.

Use simple single-line `KEY=value` entries, optionally quoted. Multiline values and interpolation are not supported. On a Linux host, `python3 scripts/environment.py` writes a private effective file to `.deploy/environment.env` for Compose. With Node installed, `npm run stack -- up -d --build` and `npm run stack -- down` perform the same resolution automatically. Standard bare `podman compose` does not resolve these layers; use the wrapper or explicit `--env-file` below.

For hosting at a path, configure these **nonsecret** staging values (keep all existing secret values):

```dotenv
VITE_BASE_PATH=/driving24/
APP_BASE_PATH=/driving24
APP_ORIGIN=https://ssccss.cc
API_ORIGIN=https://ssccss.cc
AUTH_ORIGIN=https://ssccss.cc/driving24-auth/
APP_HOST=ssccss.cc
COOKIE_DOMAIN=ssccss.cc
AUTH_COOKIE_HOST_ONLY=false
BACKEND_PORT=13000
AUTHELIA_PORT=19091
FRONTEND_PORT=18080
AUTHELIA_SERVER_ADDRESS=tcp://0.0.0.0:9091/driving24-auth
DATABASE_URL=sqlite:/data/patente.db
```

Origins contain only scheme and hostname; the path is separate. Changing `VITE_BASE_PATH` requires rebuilding the frontend. The authentication portal uses a subpath on the same hostname. Dev remains at `http://localhost:5173/`; its HTTPS demo identity origins are used internally by the localhost cookie bridge.

```sh
python3 scripts/environment.py
podman compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env up -d --build
podman compose -p patente -f compose.yaml -f compose.limits.yaml --env-file .deploy/environment.env down
```

## Deployment behavior

`scripts/deploy.sh` runs from the workflow's tested checkout and receives its commit SHA. It validates prerequisites and configuration, fetches `main`, saves any tracked local changes into a dedicated stash, pulls with `--ff-only`, then applies that exact stash. Conflicts stop deployment; the stash is retained for recovery. If Git fails before applying the stash, recover the saved changes manually after resolving the error. Untracked files are not stashed; `.env.staging` is ignored, checked to remain unchanged, and never sourced as a shell script. Avoid changing application source on the production server: restored local edits are not covered by CI tests.

The checkout must match the tested SHA; a newer `main` cancels that older deployment. An additional server-side file lock prevents concurrent SSH deployments.

The server builds frontend assets using a temporary Node 24 container image, removes the application containers with `compose down` (without `--volumes`), rebuilds backend/NATS/Authelia images, and starts them. It checks `/health`, which includes SQLite, Authelia, and NATS connectivity. After success, frontend assets are copied to `dist/`; previous hashed assets are retained for browsers already using an older page. No Node installation is required on the server.

This sequence has downtime. A failed rebuild after `down` leaves the application stopped; automatic rollback is not included. Persistent volumes (`backend-data`, `identity-data`, `authelia-data`, `nats-data`) are never deleted. Back these up separately; Git stash does not back up the database.

Backend and Authelia publish only loopback ports, configured by `BACKEND_PORT` and `AUTHELIA_PORT` (container ports remain `3000` and `9091`). The current server uses `13000` and `19091` to avoid its existing service on port `3000`. NATS stays private on the Compose network. Runtime memory ceilings total 272 MiB for the four long-running services, excluding the host and frontend/image builds. The current EC2 server has about 1.8 GiB RAM; build workloads require more memory than the runtime stack.

## Host reverse proxy

The frontend now runs in a fourth, non-root, read-only container with a 16 MiB limit. Static HTML and assets use `Cache-Control: public, max-age=300`. It has no host-directory mounts: host Nginx never needs access to the deploy user's home, build files or secrets. Backend/Authelia remain separate loopback listeners and NATS remains private. The total configured runtime memory ceiling is 272 MiB; builds require additional memory.

Include `infra/host/driving24.conf` inside the existing application-domain server block after copying it to `/etc/nginx/snippets/driving24.conf`. Do not create a second server block for the same domain. The host snippet assumes external HTTPS terminates at Cloudflare while the origin connection uses HTTP; it sets the forwarded scheme accordingly. It does not configure host Nginx, TLS, DNS or autostart itself.

| Public route | Loopback listener |
| --- | --- |
| `/driving24/`, login, register, backoffice and assets | `127.0.0.1:18080`, preserve the entire path |
| `/driving24/api/*` | `127.0.0.1:13000/api/*`, strip the application prefix |
| `/driving24/health` | `127.0.0.1:13000/health` |
| `/driving24-auth/*` | `127.0.0.1:19091`, preserve the entire path |

Set `FRONTEND_PORT=18080`, `AUTH_ORIGIN=https://ssccss.cc/driving24-auth/` and `AUTHELIA_SERVER_ADDRESS=tcp://0.0.0.0:9091/driving24-auth` in the private staging file. Dev uses root paths. Authelia serves both root internal endpoints and the configured public subpath, so backend authentication calls remain internal. No authentication subdomain is required. Configure Cloudflare to bypass cache for API, health and Authelia routes; static content uses a five-minute TTL.

Autostart remains an infrastructure concern. Lingering keeps the user manager available after SSH logout; it does not install an application startup unit. No systemd units are installed here.

## Local checks

```sh
npm ci
npm --prefix src/modules/backend ci
npm run test:backend
npm run test:frontend
npm run test:deploy
npm run test:ci
```

Deployment safeguard tests use mocked Git/Podman commands in temporary directories; they do not connect to EC2 or modify real containers. Bash is required (Git Bash on Windows). Backend integration tests use dedicated temporary SQLite databases and an Authelia HTTP fixture.
