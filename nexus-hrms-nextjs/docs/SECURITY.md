# Security baseline and threat model

Threats: credential stuffing, privilege escalation, insecure object references, cross-tenant leaks, malicious uploads, CSV formula injection, session theft, CSRF, audit-log leakage, dependency compromise, exposed secrets, unauthorized manager scope, replay and concurrent approvals.

Controls to complete: bcrypt password hashing; secure cookies and session revocation; privileged MFA; login/API rate limits; server-side validation and resource authorization; company scope from session; TLS, CSP and security headers; CSRF review; platform secret manager and rotation; safe file parsing/size checks; redacted structured audit logs; dependency/secret/SAST/container scans; backup restore drills; negative tests for every role and tenant boundary.

Auth.js Credentials and role metadata here are a starting point, not a completed security program. UI visibility is not authorization. Complete a qualified security review before storing real employee data.
