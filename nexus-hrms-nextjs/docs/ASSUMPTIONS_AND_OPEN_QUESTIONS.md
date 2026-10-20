# Assumptions and open questions

## Working assumptions
- The initial configuration seeds one company; schema supports multiple companies.
- Asia/Kolkata is only a seed/default timezone, not a legal policy decision.
- Payroll and tax processing are out of scope.
- Company employee and organization records are entered by authorized administrators and persisted to PostgreSQL.
- Job title alone does not grant permissions.
- Historical attendance data, if present, is retained without an active attendance application workflow.

## Product-owner questions
1. Launch countries, legal entities and timezones?
2. Single-company or multi-company from day one?
3. Password sign-in, Google/Microsoft SSO, or both? Which MFA?
4. Mandatory/sensitive employee fields and visibility by role?
5. Required hierarchy levels and who may alter reporting?
6. Routing of pending approvals after manager change/unavailability?
7. Leave types, accrual, carry-forward, expiry, half-day and negative balance rules?
8. Do pending requests reserve balance? How are holidays/weekends calculated?
9. Shift, break, grace, overtime and overnight rules?
10. Monthly import format and employee/date conflict policy?
11. Who may import, unlock periods, export data and inspect audit logs?
12. Retention, RPO/RTO, notifications and volume expectations?
13. Deployment platform, domain, email provider and monitoring tools?

Do not silently invent legal or payroll-impacting rules; record decisions and effective dates.
