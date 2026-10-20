# Leave workflow and email setup

## Current behavior

- The applicant is derived from the signed-in employee profile; the browser cannot submit a different employee identity.
- Same-day leave applications are allowed. Backdated requests are rejected using the Asia/Kolkata calendar date.
- Pending requests can be withdrawn by their owner or a company administrator. The row is retained with `CANCELLED` status and an audit event.
- Approved requests cannot be deleted through the leave API.
- Approval and rejection trigger a best-effort email when Resend is configured.

## Email configuration

Add these variables to the untracked local `.env` file:

```env
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="Bert Labs People Operations <hr@your-verified-domain.example>"
```

Use a sender address/domain verified with Resend. The employee's `Employee.email` is the recipient. Without these variables, leave decisions still persist but no email is sent. Provider failures are logged; reliable retries require a persistent notification queue.
