# Bert Labs People Operations

A role-aware employee operations application built with Next.js, React, TypeScript, PostgreSQL, Prisma, Auth.js, Zod, and Recharts. Employee, organization, and leave records are stored in the configured PostgreSQL database and exposed according to the signed-in user's company and role.

## Capabilities

- Authenticated company workspace for administrators, managers, and employees.
- Employee directory with new-login creation or association to an existing login.
- Self-service employee profiles and team-lead profile views, with private contact details scoped to the employee and their team leads.
- Organization browser backed by company, department, team, and employee records.
- Leave requests with company-holiday-aware working-day calculations, optional partial-day time ranges, up to seven calendar days of sick-leave backdating, scoped approvals, approval history, and audit events.
- Dashboard notifications listing every pending leave request in the signed-in team lead's review scope; team leads may also reject a previously approved request.
- Role-aware dashboard and company-scoped APIs.
- PostgreSQL schema managed with Prisma; automated validation and browser smoke tests.

## Requirements

- Node.js 22 LTS and npm 10 or later.
- PostgreSQL 16 or a compatible PostgreSQL service.
- Docker Desktop is optional; a local PostgreSQL installation can be used instead.

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create `.env` from `.env.example`. Set a private PostgreSQL `DATABASE_URL`, a unique `AUTH_SECRET` with at least 32 random characters, and the local `AUTH_URL` and `APP_URL`.

3. Start PostgreSQL. Alternatively, with Docker available:

   ```powershell
   docker compose up -d postgres
   ```

4. Prepare the schema and generate the Prisma client:

   ```powershell
   npx prisma db push
   npx prisma generate
   ```

5. Configure at least one administrator for a new installation, then seed the organization setup:

   ```powershell
   $env:SEED_ADMIN_EMAILS = "admin@your-company.example"
   $env:SEED_ADMIN_PASSWORD = "use-a-private-password-of-at-least-14-characters"
   npm run db:seed
   Remove-Item Env:SEED_ADMIN_EMAILS, Env:SEED_ADMIN_PASSWORD
   ```

   The first configured address receives the super-admin role; further addresses receive the HR-admin role. The seed creates company roles, permissions, a General team, and common leave categories. It does not create employee identities. Do not use example credentials or commit environment files.

6. Start the application:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000` and sign in with the administrator account configured above. Administrators can create an employee profile and associate it with a login. For an existing account, choose **Link an existing login**; provide only real employee details.

After signing in, use **How to use this workspace** in the sidebar or read [the user guide](./docs/USER_GUIDE.md). A valid sign-in session is shared across protected pages; choose **Sign out** from the sidebar to end it.

For a step-by-step Windows setup on a new laptop, including clean installation, PostgreSQL setup, and restoring an existing database, follow [the new-laptop setup guide](./docs/NEW_LAPTOP_SETUP.md).

For the Prisma migration baseline, safe database copy procedure, and Vercel migration build command, see [the database migration guide](./docs/DATABASE_MIGRATION.md).

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Company account sign-in |
| `/dashboard` | Role-scoped workforce overview |
| `/employees` | Company employee directory and profile creation |
| `/people` | Team-lead directory with search and team-scoped profile links |
| `/profile` | View or edit your own employee profile |
| `/organization` | Company units, departments, and teams |
| `/leave` | Employee requests and authorized approvals |
| `/admin` | Access governance and management controls |
| `/api/v1/employees` | Company-scoped employee read and admin creation |
| `/api/v1/employees/[id]` | Scoped employee profile read and update |
| `/api/v1/teams` | Company-scoped organization read and team management |
| `/api/v1/departments` | Company-scoped department management |

## Validation

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
npm run test:e2e
```

## Deployment and data integration

Deploy Next.js to a Node-compatible host and PostgreSQL to a managed PostgreSQL service. Configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and `APP_URL` through the host's secret manager. Review Prisma schema changes before applying them to production data. Enable HTTPS, restricted database networking, backups, and access monitoring.

This application reads and writes records in the PostgreSQL database configured by its operator. Connecting it to Bert Labs' other HR platforms, employee directory, identity provider, or company-specific policies requires the appropriate source data and authorized integration credentials.
