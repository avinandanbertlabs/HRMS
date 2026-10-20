# API specification (starter)

Protected routes require an Auth.js session. Derive company scope from session. Standard error: `{ "error": "...", "details"?: ... }`; never return stack traces or sensitive fields.

| Method | Endpoint | Scope | Starter behavior |
|---|---|---|---|
| GET | `/api/v1/employees?q=&limit=` | employee read + resource scope | Search/paginate up to 100 |
| POST | `/api/v1/employees` | employee create | Create a login or link an existing login, tenant scope, audit event |
| GET | `/api/v1/leave` | own leave | List own requests |
| POST | `/api/v1/leave` | leave apply | Date validation, overlap check, create pending request |
| GET | `/api/v1/teams` | organization read | Company-scoped organization counts and teams |
| POST | `/api/v1/teams` | organization manage | Create a company team and audit the change |
| POST | `/api/v1/departments` | organization manage | Create a department and audit the change |

Example create employee: `{ "employeeCode":"BL-1040", "firstName":"Samira", "lastName":"Das", "email":"samira@company.example", "accountMode":"LINK_EXISTING" }`.

Still required: employee update/deactivate; org and leave policy CRUD; leave cancellation/balance reporting; cursors; rate limiting; generated API contract; detailed permission guards.


## Implemented role-scoped leave and team routes

- `GET /api/v1/leave`: returns all company requests for admins, only requests for led team(s) for team leads, and only the signed-in employee's requests for employees.
- `POST /api/v1/leave`: creates a request for the signed-in employee only. Employee ID, team ID, and approver are not accepted from the client. Team and approver are derived server-side from `Employee.teamId` and `Team.leadEmployeeId`.
- Optional `partialStartTime` and `partialEndTime` fields support a single-day partial leave. The server calculates fractional leave units using an eight-hour workday; full-day requests remain date-based.
- Leave reasons and approval/rejection notes are limited to 500 words (and 10,000 characters).
- `PATCH /api/v1/leave/:id`: approves/rejects only if the caller is a company admin or the configured lead of the request's team. Rejection requires a reason. The decision and audit event are persisted transactionally.
- `GET /api/v1/teams`: company-admin only; lists teams and employees eligible for lead assignment.
- `PATCH /api/v1/teams/:id`: company-admin only; assigns/clears a team lead. Assigning a lead grants `MANAGER`; clearing the final team-lead assignment removes it.
- `GET /api/v1/employees`: returns company-wide records for admins, assigned-team records for managers, and only the caller's own record for employees.
- `POST /api/v1/employees`: company-admin only; creates an employee and login account, validates team/company scope, and writes an audit event.

All company data access is constrained by the authenticated session's company ID.
