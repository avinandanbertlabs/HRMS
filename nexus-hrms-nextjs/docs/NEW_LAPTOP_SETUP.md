# Set up Bert Labs People Operations on a new Windows laptop

This guide covers a clean installation and moving an existing local database. The application does not download employee data or create email inboxes. To keep existing profiles and leave history, back up and restore the PostgreSQL database; do not start with the clean-install seed steps.

## 1. Copy the application source

Copy or download the project source to the new laptop from your approved private location. Include `package.json`, `package-lock.json`, `prisma`, `src`, and the other tracked project files.

Do not transfer `node_modules` or `.next`; these are rebuilt on the new laptop. Do not put `.env`, database backups, or `INITIAL-ACCOUNT-CREDENTIALS.txt` in a public repository or an unencrypted shared folder. Transfer secrets and backups only through an approved, protected channel.

Open PowerShell in the project folder:

```powershell
Set-Location "C:\path\to\nexus-hrms-nextjs"
```

Replace the example path with the folder where you copied the project.

## 2. Install or prepare Node.js

The project requires **Node.js 22 LTS** and npm 10 or later.

- If you can install software, install Node.js 22 LTS from the official Node.js website and reopen PowerShell.
- If you do not have Windows administrator access, download the official Windows x64 ZIP distribution of Node.js 22 LTS, extract it to a folder you can write to (for example, `$HOME\tools\node`), then add that folder to the current PowerShell session:

  ```powershell
  $env:Path = "$HOME\tools\node;$env:Path"
  node --version
  npm.cmd --version
  ```

  Confirm Node reports `v22.x` and npm reports version 10 or later. Reapply the `PATH` command in each new PowerShell window, or add the extracted directory to your user PATH settings.

## 3. Choose how PostgreSQL will run

The app needs a PostgreSQL database. Choose one:

1. **An authorized existing PostgreSQL server:** Ask its owner/administrator for a database, a restricted application user, and the connection details. You do not need database server administrator access if the database/user have already been provisioned.
2. **Docker Desktop:** If Docker Desktop is already installed and available, use the project’s PostgreSQL container as described below. Installing or enabling Docker Desktop may require an administrator.
3. **A local PostgreSQL installation:** Install PostgreSQL 16 or a compatible release and create a database/user. Installing the service may require an administrator.

### Optional: start PostgreSQL with Docker Compose

Set a private password in the project `.env` before starting the container (step 4). In PowerShell:

```powershell
docker compose up -d postgres
docker compose ps
```

Wait for the `postgres` service to become healthy. The Compose configuration keeps database files in a Docker volume, so removing the application source folder does not itself remove that volume. Do not run `docker compose down -v` unless you intentionally want to delete the database volume.

If Docker is not installed or access is blocked by policy, use an authorized PostgreSQL server or ask the device administrator to provision it. Do not try to bypass device or network policies.

## 4. Configure the application

Create a local environment file from the example:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set the values for your selected PostgreSQL server. For a local Docker Compose database, use the password you chose for `POSTGRES_PASSWORD`:

```dotenv
DATABASE_URL="postgresql://hrms:YOUR_URL_ENCODED_PASSWORD@localhost:5432/hrms?schema=public"
POSTGRES_PASSWORD="YOUR_LOCAL_POSTGRES_PASSWORD"
AUTH_SECRET="replace-with-a-new-random-secret"
AUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

Use a unique, private database password. If it contains URL-reserved characters, URL-encode them in `DATABASE_URL`. Generate an authentication secret with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the generated value into `AUTH_SECRET`. Keep `.env` private and do not commit or send it in chat. The optional email settings can remain blank unless an administrator has configured an email provider.

## 5. Install dependencies and generate the Prisma client

Run from the project folder:

```powershell
npm ci
npm run db:generate
```

`npm ci` installs the versions recorded in the lockfile. If it fails because Node/npm is not on `PATH`, repeat the Node PATH step above.

## 6. Prepare the database

### Clean installation with a new, empty database

Apply the current Prisma schema:

```powershell
npm run db:push
```

Configure the first administrator and seed the initial company roles, leave types, and `General` team. Use an administrator login email you control and a unique password of at least 14 characters:

```powershell
$env:SEED_ADMIN_EMAILS = "admin@your-company.example"
$env:SEED_ADMIN_PASSWORD = "use-a-unique-private-password"
npm run db:seed
Remove-Item Env:SEED_ADMIN_EMAILS, Env:SEED_ADMIN_PASSWORD
```

The first configured administrator receives the Super Admin role. The seed does not create employee profiles; sign in and create the real team and employee records in the application. Do not use sample/example passwords in a real environment.

The seed is designed to create or update initial configuration. Running it again with administrator environment variables can reset the password of the matching administrator account; do not rerun it casually.

### Moving existing company data to this laptop

Use this path instead of the clean-install seed steps if the old laptop has the employee and leave data you need:

1. On the old laptop, create a PostgreSQL custom-format backup using `pg_dump` and an authorized database account. For example:

   ```powershell
   pg_dump --host=localhost --port=5432 --username=hrms --format=custom --file="C:\secure-transfer\bert-labs-hrms.backup" hrms
   ```

   Enter the database password when prompted. The PostgreSQL client tools must be installed and available on `PATH`.
   
   The example uses the Compose defaults (`hrms` database/user on port `5432`). Substitute the actual database name, username, host, and port from the old laptop's `DATABASE_URL` and database setup.
2. Transfer the backup to the new laptop through an approved encrypted channel. Treat it as sensitive employee data.
3. Provision an empty PostgreSQL database on the new laptop/server and update `DATABASE_URL` in `.env` to point to it.
4. Restore the backup into that empty database. For example:

   ```powershell
   pg_restore --host=localhost --port=5432 --username=hrms --dbname=hrms --no-owner --no-acl "C:\secure-transfer\bert-labs-hrms.backup"
   ```
5. From the project folder, generate the Prisma client and bring the restored database schema up to date:

   ```powershell
   npm run db:generate
   npm run db:push
   ```

   Back up the restored database before applying schema changes. Do not use Prisma's `--force-reset` option. Do **not** run `npm run db:seed` on a restored database as part of ordinary startup: it can reset an administrator password if seed credentials are set.
6. Sign in using an existing administrator login. The password hashes and records are in the database backup; the old browser session is not. Users will need to sign in again on the new laptop.

If `pg_dump` or `pg_restore` reports a major-version incompatibility, use PostgreSQL client tools compatible with the source/target server versions or ask the database administrator to perform the migration. Do not discard the source database until the restored app and its records are verified.

## 7. Start and check the app

For local development:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in. Keep the PowerShell window open while using the app; press `Ctrl+C` to stop the development server.

For a local production-mode check instead:

```powershell
npm run build
npm run start
```

Then open [http://localhost:3000](http://localhost:3000). Keep the server window open while the app is running.

After first sign-in, verify that the administrator page opens, create or review a team, assign an active team lead as the leave approver, and check that the employee directory and leave data show the expected records. On a clean installation, add real company details; the starter seed creates only the initial company configuration.

## Optional: access from another device on the same network

This is optional and should only be done on a trusted private network. Start the development server bound to the network interfaces:

```powershell
npm run dev -- --hostname 0.0.0.0
```

Find the laptop's private IPv4 address with `ipconfig`, then open `http://<laptop-ip>:3000` from the other device. For this setup, update `AUTH_URL` and `APP_URL` in `.env` to that address and restart the app. The other device must be able to reach the laptop and its PostgreSQL connection. Windows Firewall may require an administrator to permit inbound access; if you do not have that access, ask the device administrator rather than disabling the firewall. Do not expose this development server or PostgreSQL directly to the public internet. For real multi-user use, deploy behind HTTPS with a secured database and approved network rules.

## Troubleshooting

- **Database connection refused:** Start PostgreSQL and verify the host, port, database name, username, password, and `DATABASE_URL`.
- **Prisma cannot connect or schema is missing:** Confirm `.env` is in the project root, then run `npm run db:generate`. For an empty database only, run `npm run db:push`; for an existing database, make a backup first.
- **Login fails after restoring:** Confirm you restored the intended database and are using a login that exists there. Restore the original database before attempting any seed or account reset.
- **Port 3000 is in use:** Stop the other local app using that port, or start Next.js with another port (for example, `npm run dev -- --port 3001`) and update `AUTH_URL`/`APP_URL` to match.
- **The app works only on the laptop:** Check that both devices are on the same trusted network, the app is bound to `0.0.0.0`, and firewall access is approved.
