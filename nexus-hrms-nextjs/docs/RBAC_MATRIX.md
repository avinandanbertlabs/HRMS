# RBAC and resource-scope matrix

The application uses role checks **and** record-level scope checks. Hiding navigation items is only a usability feature; API handlers and protected server pages enforce access independently.

| Capability | Super Admin / HR Admin | Team Lead / Manager | Employee |
|---|---|---|---|
| Company employee directory | All employees in own company | Not exposed in UI; employee API is team-scoped if called | Own employee record only through scoped API |
| Create employee/login | Yes | No | No |
| Team and team-lead assignment | Yes | No | No |
| Leave request creation | Own linked employee profile only | Own linked employee profile only | Own linked employee profile only |
| Leave request list | All requests in own company | Only employees belonging to teams where this user is the configured lead | Own requests only |
| Approve/reject leave | All requests in own company | Only pending requests from assigned team(s) | No |
| Organization and access policy pages | Yes | No | No |
| Dashboard metrics | Company-wide | Assigned team(s) | Own leave data only |

## Routing rule

An employee is assigned to a `Team` through `Employee.teamId`. An administrator assigns that team's lead using `Team.leadEmployeeId`. When a leave request is created, the API derives the team and `approverId` from the employee record and the team's lead. The browser cannot submit a team name or approver to change routing.

## Initial organization setup

The seed creates a `General` team, company roles, permissions, and common leave categories. It does not create employee profiles or employee login accounts. Administrators add real people and organization records using the company workspace.

## Important boundaries

- Every request is tenant-scoped by the authenticated user's `companyId`.
- A manager with no employee profile or no configured lead team sees no team requests and cannot decide any request.
- A team lead assignment grants the `MANAGER` role; removing the last team-lead assignment removes that role.
- Rejections require a reason. Decisions are written to the leave approval record and audit log.
- Role changes are refreshed from the database on subsequent Auth.js session requests; sign out and back in if a browser session still shows stale navigation.
- Before production use, add formal role-administration workflows, password reset/invitations, MFA, rate limiting, and comprehensive authorization tests.
