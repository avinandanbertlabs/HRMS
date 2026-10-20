# Software Requirements Specification

## Authentication and employee management
- Sign in/out, account invitation/activation, recovery and privileged MFA.
- Employee create/read/update/deactivate with department, team, designation and manager assignments.
- Authorized search/filter/pagination; onboarding/offboarding; access revocation.
- Preserve reporting history and enforce tenant isolation, RBAC and resource-level permissions server-side.

## Leave management
- Configure leave types, policies, accrual, carry-forward, expiry and eligibility.
- Full and partial days with optional time ranges, holidays and weekly offs; validate balances/overlap; reserve pending balances per policy.
- Route approvals, delegation/escalation, notifications, cancellation and reports. Maintain an auditable transaction ledger.

## Non-functional requirements
Security and least privilege; reliability and tested backups; pagination and indexed queries; accessible keyboard flows; responsive layouts from 320px+; strict TypeScript, tests and reviewed migrations.
