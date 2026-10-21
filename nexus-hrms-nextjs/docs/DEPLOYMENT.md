# Deployment guide

## Vercel production

1. Create a Vercel project connected to the application repository and use Node.js 22.
2. Provision a managed PostgreSQL database. Before applying migrations or seeding, identify whether it is empty or contains data and follow the checks in [the database migration guide](./DATABASE_MIGRATION.md). Do not point a new deployment at an unverified database.
3. In **Vercel → Project Settings → Environment Variables**, add these variables for **Production**:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Private connection string for the verified production PostgreSQL database |
   | `AUTH_SECRET` | A unique, randomly generated secret (at least 32 random characters); store it only in Vercel |
   | `AUTH_URL` | The deployed production origin, for example `https://hr.example.com` |
   | `APP_URL` | The same deployed production origin |

   Do not commit these values, add them to a build command, or share them in logs/screenshots. Generate the auth secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and enter the result directly into Vercel.
4. After the database is verified and the initial migration is applied or baselined as described in the migration guide, set Vercel's **Build Command** to:

   ```text
   npm run build
   ```

   The package build script applies committed Prisma migrations, generates the Prisma client, and then builds Next.js. Do not use this process to initialize an unknown or populated database.
5. Deploy and verify the production URL, login page, and database-backed health by signing in with an authorized account.

### Provisioning the first administrator

There is no built-in or shared demo login. For a **new, confirmed-empty** production database, provision the administrator once using a unique work email and a strong, private password:

1. From a trusted machine, set `DATABASE_URL` to the exact verified production database connection string for this one-time operation. Do not paste it into source code or chat.
2. Set `SEED_ADMIN_EMAILS` to the administrator's work email and `SEED_ADMIN_PASSWORD` to a unique password of at least 14 characters. Optionally set `SEED_ADMIN_NAME`.
3. Run `npm run db:seed` once. This creates the organization roles and the administrator account. The first email receives `SUPER_ADMIN`; additional emails receive `HR_ADMIN`.
4. Remove the seed variables and production `DATABASE_URL` from the shell after the operation. Deliver the initial password through an approved private channel and change it after sign-in.

Do not set seed credentials as Vercel Build Command arguments or leave them configured for subsequent deployments. The seed operation can reset the password of an existing account with a matching email. If the production database already contains users or employee data, do not seed blindly; verify the account and database state first. For a Preview deployment, use an isolated disposable database and credentials that are never reused in Production.

## Local

Use Node.js 22 LTS, PostgreSQL 16, and a private `.env` file. Use `prisma db push` only for disposable local setup. See the README for local installation and development steps.

## General production practices

Use private database networking, TLS, encrypted backups, point-in-time recovery, HTTPS, security headers/CSP, redacted logs, health checks, and alerts. Keep development, preview, and production databases and credentials separate. Define RPO/RTO, retain encrypted backups, test restores, and maintain an incident-response process.

## CI/CD

Install from the lockfile; typecheck, lint, and test; run secret/dependency/SAST/container scans; build and scan the artifact; apply reviewed Prisma SQL migrations in a controlled job; stage and smoke-test; require approval; canary/pilot; monitor; and roll back the app or use the tested database recovery strategy.

## Container note

The Dockerfile uses Next standalone output. Verify build paths and versions, pin base image digests, scan the image, and never bake secrets into layers.
