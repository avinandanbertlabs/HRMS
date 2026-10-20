# Architecture

## Style
Next.js App Router modular monolith. React Server Components by default; Client Components for interactions. Route Handlers/Server Actions invoke domain services. Prisma is the database adapter. No separate Express/Nest backend.

## Data flow
Browser → Next.js UI → authenticated Route Handler → Zod validation → authentication/RBAC/resource guard → domain service → Prisma transaction → PostgreSQL → audit event.

## Boundaries
Auth; employees and organization; leave management; permissions; audit. Attendance routes and UI have been retired. Legacy attendance tables are retained to preserve historical data.

## Tenant isolation
Every tenant-owned query must constrain companyId from the authenticated session, never a client-provided ID. Prove resource scope through parent relations. Test negative cross-tenant reads/writes.

## Reliability
Transactions for approvals + ledger. Use optimistic concurrency where approvals may race; add reliable notification delivery/outbox as required.
