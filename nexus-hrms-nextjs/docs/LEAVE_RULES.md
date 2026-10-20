# Leave rules and open decisions

The schema models leave types, policies, accrual, carry-forward, balances, ledger, requests, approvals and holiday calendars. The current leave workflow supports requests, scoped approvals, audit events, and configured notifications; a complete policy engine is not yet implemented.

Confirm eligibility/tenure; accrual and proration; pending balance reservation; weekend/holiday counting; half-day periods; timezone and year boundary; carry-forward caps/expiry; encashment; cancellation after approval; negative balances; policy effective dates; approval levels/delegation; manager changes during pending requests; escalation SLA; notifications; retroactive correction.

Acceptance: concurrent approvals cannot overdraw balances; every credit/debit has a ledger entry; overlaps follow policy; approved leave totals reflect fractional partial-day units; historical transactions are not silently rewritten.


## Implemented safeguards

- The leave form displays the authenticated employee's full name as a read-only applicant field. The API derives the employee relation from the signed-in account, never from client-submitted identity.
- Leave lists display the applicant's full name.
- Same-day leave applications are permitted, including sick leave; the API rejects backdated start dates using the `Asia/Kolkata` calendar date.
- Approved leave requests cannot be deleted. A pending request can be withdrawn by its owner (or company admin), which marks it `CANCELLED` and writes an audit log entry rather than removing the row.
- Approval/rejection decisions attempt to email the employee through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are configured. Decision persistence is independent of email delivery. Email retries/outbox persistence still require a production notification worker.
