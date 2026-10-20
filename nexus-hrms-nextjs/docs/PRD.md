# Product requirements — Bert Labs People Operations

## Overview
Bert Labs People Operations centralizes secure authentication, employee records, organization/reporting, and leave workflows. Attendance operations have been removed from the application; payroll, salary processing, and tax deduction are outside the current scope.

## Personas
- Super Admin: system settings, privileged access, security and audit.
- HR Admin: employee lifecycle, policies and authorized company-wide reports.
- Department Head: scoped department reporting and escalation.
- Manager / Team Lead: review requests for authorized reports.
- Employee: own profile and leave requests.
- Auditor: explicitly authorized read-only records and audit trails.

## MVP goals
1. Secure company-scoped access and configurable RBAC. 2. Employee and reporting records with history. 3. Policy-based full-day and partial-day leave workflows and auditability. 4. Responsive accessible dashboards.

## Out of scope
Payroll execution, tax calculation, payslips, benefits, ATS, performance management, biometric integrations and native mobile apps. Future payroll permissions must be separate from general HR permissions.

## Success measures
Every protected endpoint has server-side authorization; no cross-company leakage; leave mutations are auditable and transactional; core mobile workflows pass viewport tests.
