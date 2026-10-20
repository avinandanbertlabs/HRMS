# Test plan

## Unit
Zod validation; leave calculations across holidays/weekends/half-days/year boundaries; partial-day duration and fractional balance calculations; 500-word leave-reason and decision-note limits; reporting-cycle and effective-date validation.

## Integration
Authenticated/unauthenticated behavior; role/resource/tenant matrix; transactional leave ledger; rollback protections; audit events.

## E2E
Login/logout; responsive navigation; employee search/filter and lifecycle; leave apply/approve/reject/cancel, including partial-day ranges; verify retired attendance routes are unavailable. Check 320, 375, 768, 1024 and 1440 CSS px for horizontal overflow and keyboard usability.

## Definition of done
Typecheck, lint, unit/integration/E2E, accessibility, migration and security reviews, backup/restore test, monitoring and rollback documentation pass.
