# Bert Labs People Operations user guide

## Sign in and protect your session

Sign in once with your work account. Your authenticated session applies to protected pages while you navigate; you should not be prompted again for every menu selection. Visiting a protected page without a valid session redirects to sign-in. Choose **Sign out** at the bottom of the left navigation to end your session, especially on a shared computer. Closing the browser tab does not sign you out. Sessions expire automatically.

## Administrator setup

1. **Set up the organization.** Review the initial `General` team. Add the company's actual business units, departments, and teams on **Organization**.
2. **Add employees.** On **People directory**, enter each person's real name, company email, approved employee ID, and team. Choose **Create a new login** to provision a login or **Link an existing login** for an active, unlinked account in the same company. Linking does not change that account's password or roles.
3. **Assign team leads.** Open **Access & policies** and assign actual employee profiles as leads of their teams. The assignment determines the manager scope and leave approval routing.
4. **Review company activity.** The dashboard and directory counts reflect employee and leave records saved in the configured database.

## Initial roster accounts

The initial roster credential sheet is generated locally as `INITIAL-ACCOUNT-CREDENTIALS.txt` and excluded from version control. Its `@bertlabs.invalid` addresses are application login IDs only; `.invalid` is a reserved non-deliverable domain, so these are not email inboxes and cannot receive password-reset messages. Give each person their credentials privately and replace the login IDs with approved company addresses when available.

## Employee workflows

- **Leave:** From **Leave**, submit a request using your linked employee profile. Choose the start and end dates first; the working-day total is shown below them and excludes weekends and configured company holidays. Only sick leave can be backdated, by up to seven calendar days. For a half day or early departure, optionally select the partial-day option and enter the time range; durations are converted using an 8-hour workday. Leave reasons and decision notes are limited to 500 words. Your team and approver are determined by your profile and team-lead assignment. Managers can only review requests in teams assigned to them.
- **Profile:** Open **My profile** to view and edit your employee details. Login email/user ID, employee number, team assignment, employment status, and password are protected. Team leads can search **Team directory**, open profiles in their assigned teams, and view approved leave totals.
- **Leave reviews:** Team leads see a list of all pending requests in their assigned teams on the dashboard. They can approve or reject pending leave and reject a previously approved request with a reason.
- **Administration:** Company admins can create employee and leader profiles, add teams, assign team members and the leave approver, and manage reporting lines. A newly created team can optionally assign an active employee as its lead; this moves that employee into the new team and grants the Manager role. Teams with members cannot be deleted. Accounts can be activated/deactivated and given temporary passwords; temporary passwords must be changed at next sign-in and password hashes cannot be viewed. Profile/login deletion is allowed only when there is no dependent leave, reporting, approval, identity-provider, or audit history; otherwise deactivate the account to preserve records.

## If something does not work

- If a page sends you to sign-in, your session may have expired; sign in again.
- If you are signed in but access is denied, ask an administrator to check your company account, role, employee profile, and team assignment.
- You can update your profile's available personal and work details. Ask an administrator to change your employee number, login account, team assignment, or employment status.
- If a requested record is missing, refresh the page and confirm it was saved to this application's configured database.

## Data integration boundary

This application works with the PostgreSQL database configured by its operator. Previously stored attendance data, if present, remains in the database for historical retention; attendance screens and APIs have been removed. This application does not automatically connect to other Bert Labs HR, identity, or payroll platforms. Any such integration requires authorized credentials, source data, and an approved integration implementation.
