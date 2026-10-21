# Database migrations and preserving existing data

## What is in the migration

`prisma/migrations/20261020210000_initial/migration.sql` is generated from the complete current Prisma schema. It creates the PostgreSQL enums, tables, indexes, unique constraints, and foreign keys, including the retained historical attendance tables. It creates the schema only; it does not insert employee records or passwords.

Prisma Migrate is now set up for future schema changes. The existing local database schema was compared with the Prisma schema and the comparison returned an empty diff. The local database was therefore baselined by recording this initial migration as already applied; this records migration history and does not recreate or delete tables.

## Verified local source data

On 2026-10-20, the local database configured for this project was checked using row counts only. No password values or employee detail fields were printed. The private credential sheet's 20 employee IDs and linked login IDs all matched employee profiles in this database.

- 5 teams, each with a lead assigned; team membership totals 18.
- 20 employee profiles with linked roster logins.
- 22 user accounts: 20 employee accounts and 2 unlinked `SUPER_ADMIN` accounts.
- 4 leave types, 4 leave requests, 6 leave-approval records, 38 audit records, and 1 attendance policy.
- 0 leave-balance rows.

This confirms the **local** database has the roster and records listed above. It does not confirm Vercel's database contents. The local database has two administrator accounts; review them before making this data available in production.

## Important distinction: database credentials and employee logins

- The app's user accounts and password **hashes** are rows in the PostgreSQL database. A full database backup/restore carries those rows, so existing app login IDs and passwords continue to work after a successful restore. Sessions/cookies are not database rows, so users sign in again.
- PostgreSQL connection credentials (`DATABASE_URL`, database user/password) are provider configuration, not part of a database dump. Configure the Vercel production `DATABASE_URL` separately in Vercel's private Environment Variables.
- `INITIAL-ACCOUNT-CREDENTIALS.txt` is a local ignored file, not a database table and not part of Bitbucket deployments or a database dump. If it is needed on another machine, transfer it separately using an approved encrypted method; do not commit it.
- A database dump includes sensitive employee, audit, and authentication data. Store it securely and restrict who can access it.

## Before using Vercel's database

Do not run a migration, seed, or restore against the Vercel database until its state is identified.

1. In Vercel, verify the project's Production `DATABASE_URL` is configured. Do not put its value into source code, chat, or screenshots.
2. Check the PostgreSQL provider's dashboard for the database/schema and its tables. If the database may contain data, take a provider backup first.
3. Determine whether it is:
   - **Empty:** It has no application tables/data.
   - **Existing and already equivalent to this app:** Its schema has all current tables and constraints; it may contain data.
   - **Non-empty but different/unknown:** Stop. Compare schemas and make a recovery plan before changing it.

The local `prisma migrate status` command only inspected the database selected by that shell's `DATABASE_URL`; it does not tell you the state of Vercel's database.

## Copying the local database to a confirmed empty Vercel database

Only use this procedure when the destination database is confirmed empty and the organization has approved moving the data to that provider. Use PostgreSQL `pg_dump`/`pg_restore` client tools compatible with the database server. Substitute the actual local connection details; the example values must not be assumed to match your installation.

1. Stop writes to the local app for the duration of the copy, or schedule a maintenance window.
2. Make a full custom-format backup of the source database. Use an approved secure location outside the repository:

   ```powershell
   pg_dump --host=127.0.0.1 --port=5432 --username=<source-database-user> --format=custom --file="C:\secure-transfer\bert-labs-hrms.backup" <source-database-name>
   ```

   `pg_dump` prompts for the database password. Do not put passwords in command text.
3. Restore into the **confirmed empty** destination database using the host, port, database, and database user from the provider. Keep the backup for verification and rollback:

   ```powershell
   pg_restore --host=<destination-host> --port=<destination-port> --username=<destination-database-user> --dbname=<destination-database-name> --no-owner --no-acl "C:\secure-transfer\bert-labs-hrms.backup"
   ```

   The restore does not transfer server-level PostgreSQL roles or the database provider's connection password. The provider supplies its own database user; Vercel must use that user's connection string.
4. Before allowing application traffic, verify the restore completed without errors and compare table names and row counts between source and destination. Verify company, employee, teams, users, leave requests/approvals, balances, and audit records. Do not share the exported counts or dump publicly.
5. After confirming the restored schema matches this migration, point a private PowerShell session at the destination `DATABASE_URL` and record the baseline as applied:

   ```powershell
   npx prisma migrate resolve --applied 20261020210000_initial
   npx prisma migrate status
   ```

   `migrate resolve` only records history; it does not alter the restored schema or copy data. Do not run it against a database whose schema has not been verified.
6. Set the exact same verified destination URL as Vercel's Production `DATABASE_URL`, set `AUTH_SECRET`, `AUTH_URL`, and `APP_URL` in Vercel, and redeploy. Confirm the deployment uses the restored database and sign in with an existing app account.
7. Retain the source database and protected backup until the deployed app is verified and a restore has been tested.

If the Vercel database is already populated, **do not restore over it**. Back it up, compare source and destination table/row inventories, and decide which database is authoritative before any merge or replacement. A blind restore can overwrite or duplicate records.

The Windows environment used for the local source check does not currently have `pg_dump` or `pg_restore` on `PATH`. Install or use PostgreSQL client tools compatible with the source and destination server versions before following the copy commands. Prisma schema migration commands do not copy data.

## Future schema changes and auto-deploy

For each schema change, create and review a new Prisma migration in development, test it against a disposable database, and commit both the Prisma schema change and the new `prisma/migrations/.../migration.sql` directory to Bitbucket. Do not edit an already-applied migration; create a follow-up migration instead.

After the Vercel database has been correctly initialized/baselined and `DATABASE_URL` is set, set Vercel's **Build Command** to:

```text
npm run build
```

The `build` script runs `prisma migrate deploy`, generates the Prisma client, and then builds Next.js. Vercel can therefore apply committed migrations during its normal Bitbucket-triggered deployment. A migration failure stops that deployment rather than silently treating the database update as successful. Test Preview deployments against a separate disposable database, not Production. Do not put seed credentials in the Build Command; `db:seed` is a one-time setup action and can reset a matching administrator password if its seed environment variables are set.

Migrations only change schema; they do not automatically back up data. Keep provider backups and test restores independently of Bitbucket/Vercel deployments.
