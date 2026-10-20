# Deployment guide

## Local
Node 22 LTS, PostgreSQL 16 and `.env`. Use `prisma db push` only for disposable local setup.

## Production
Deploy Next.js to a Node-compatible managed platform or container; use managed PostgreSQL with private networking, encryption, backups and point-in-time recovery. Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_URL` in the secret manager. Enforce HTTPS, headers/CSP, redacted logs, health checks and alerts. Separate dev/staging/prod credentials and databases.

## CI/CD
Install from lockfile; typecheck/lint/test; run secret/dependency/SAST/container scans; build and scan artifact; apply reviewed Prisma SQL migrations in a controlled job; stage and smoke-test; require approval; canary/pilot; monitor; rollback app or use tested DB recovery strategy.

## Container note
Dockerfile uses Next standalone output. Verify build paths and versions, pin base image digests, scan image and never bake secrets into layers. Define RPO/RTO, encrypted backup retention, restore drills and incident response.
