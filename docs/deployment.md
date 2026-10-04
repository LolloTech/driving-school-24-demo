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

Git, rootless Podman, and a Compose provider are required. All containers belong to `deploy`, not `ubuntu` or root. The administrator installs the provider system-wide with `sudo apt install podman-compose`. Rootless UID/GID mappings must be configured by the administrator.

Clone location:

```sh
git clone https://github.com/LolloTech/driving-school-24-demo.git /home/deploy/projects/driving-school-24-demo
```

Create `/home/deploy/projects/driving-school-24-demo/.env` from `.env.example` with permissions `600`. Set your public Cloudflare application/authentication HTTPS origins and common cookie domain. Generate each application secret independently with `openssl rand -hex 32`. Do not commit `.env`; deployments never replace it. The repository is public, so Git pulls need no GitHub credentials on this host.

The first container startup provisions a random administrator password in `infra/runtime/admin-credentials.txt` on the server. Read it over your trusted SSH connection; it is never printed in the pipeline. Existing identities and passwords are preserved on later deployments. Demo quiz seeding is optional and is not run by deployment.

## Deployment behavior

`scripts/deploy.sh` runs from the workflow's tested checkout and receives its commit SHA. It validates prerequisites and configuration, fetches `main`, saves any tracked local changes into a dedicated stash, pulls with `--ff-only`, then applies that exact stash. Conflicts stop deployment; the stash is retained for recovery. If Git fails before applying the stash, recover the saved changes manually after resolving the error. Untracked files are not stashed; `.env` is ignored, checked to remain unchanged, and never sourced as a shell script. Avoid changing application source on the production server: restored local edits are not covered by CI tests.

The checkout must match the tested SHA; a newer `main` cancels that older deployment. An additional server-side file lock prevents concurrent SSH deployments.

The server builds frontend assets using a temporary Node 24 container image, removes the application containers with `compose down` (without `--volumes`), rebuilds backend/NATS/Authelia images, and starts them. It checks `/health`, which includes SQLite, Authelia, and NATS connectivity. After success, frontend assets are copied to `dist/`; previous hashed assets are retained for browsers already using an older page. No Node installation is required on the server.

This sequence has downtime. A failed rebuild after `down` leaves the application stopped; automatic rollback is not included. Persistent volumes (`backend-data`, `identity-data`, `authelia-data`, `nats-data`) are never deleted. Back these up separately; Git stash does not back up the database.

Backend and Authelia publish only loopback ports, configured by `BACKEND_PORT` and `AUTHELIA_PORT` (container ports remain `3000` and `9091`). The current server uses `13000` and `19091` to avoid its existing service on port `3000`. NATS stays private on the Compose network. Runtime memory ceilings total 256 MiB for the three long-running services, excluding the host and frontend/image builds. The current EC2 server has about 1.8 GiB RAM; build workloads require more memory than the runtime stack.

## Routing owned by the server administrator

No Nginx, Cloudflare tunnel, TLS certificate installation, or system autostart is configured by this change.

| Route | Target |
| --- | --- |
| Public site and SPA fallback | `dist/index.html` |
| `/login`, `/register`, `/backoffice`, `/backoffice/*` | `dist/backoffice.html` |
| `/assets/*` | `dist/assets/*` |
| `/api/*`, `/health` | `127.0.0.1:13000` (configured `BACKEND_PORT`), preserve paths and cookies |
| Authentication hostname | `127.0.0.1:19091` (configured `AUTHELIA_PORT`), preserve public host and forwarded HTTPS scheme |

Autostart and user-session lifetime remain infrastructure concerns. The administrator may enable user lingering if needed; no systemd units are installed here.

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
