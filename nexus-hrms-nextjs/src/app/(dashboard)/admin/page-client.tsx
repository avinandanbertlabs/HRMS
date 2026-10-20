import { KeyRound, LockKeyhole, Settings2, ShieldCheck, UserCog } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";
import { TeamAssignmentManager } from "@/components/layout/team-assignment-manager";
import { AccountManager } from "@/components/admin/account-manager";

const roles = [
  { name: "Super Admin", key: "SUPER_ADMIN", description: "Privileged access, company settings, and security governance.", scope: "Company-wide administration" },
  { name: "HR Admin", key: "HR_ADMIN", description: "Employee lifecycle, organization, and leave administration.", scope: "Company-wide HR" },
  { name: "Department Head", key: "DEPARTMENT_HEAD", description: "Authorized department reporting and escalations.", scope: "Department scope" },
  { name: "Manager / Team Lead", key: "MANAGER", description: "Review requests within assigned team scope.", scope: "Assigned teams" },
  { name: "Employee", key: "EMPLOYEE", description: "Own employee profile and leave services.", scope: "Own records" },
  { name: "Auditor", key: "AUDITOR", description: "Read-only access to explicitly authorized records and audit events.", scope: "Read-only scope" },
];

const deploymentChecks = [
  "Use unique, restricted database credentials and a private application secret.",
  "Enable HTTPS and verify secure cookie behavior on the production domain.",
  "Choose an identity provider and configure multi-factor authentication if required.",
  "Review login abuse protections and monitoring for the selected hosting platform.",
  "Test company isolation and resource-level permissions with dedicated accounts.",
  "Confirm database backup schedules and perform a recovery test.",
  "Establish dependency, image, and infrastructure security scanning.",
  "Set audit event retention, review ownership, and access procedures.",
];

export default function Admin() {
  return <Page>
    <PageHeading eyebrow="GOVERNANCE & CONTROLS" title="Administration center" subtitle="Manage employee access, reporting lines, teams, and account security against the live company database." />

    <div className="notice" style={{ marginBottom: 18 }}>
      <strong>Company administration:</strong> Create employee and leader profiles, maintain reporting lines, configure teams and their leave approvers, and activate, reset, or safely delete eligible accounts. Changes are company-scoped and recorded in the audit history.
    </div>
    <AccountManager />

    <div className="three-col" style={{ marginBottom: 18 }}>
      <article className="panel panel-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div className="section-title">Identity & access</div><LockKeyhole size={17} color="var(--cyan)" /></div>
        <div className="section-note" style={{ lineHeight: 1.7, marginTop: 10 }}>Account activation, temporary-password reset, mandatory first-login password change, and company/resource-scoped access.</div>
        <div style={{ marginTop: 17 }}><span className="pill green">Enforced in application</span></div>
      </article>
      <article className="panel panel-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div className="section-title">Multi-factor authentication</div><ShieldCheck size={17} color="#b42332" /></div>
        <div className="section-note" style={{ lineHeight: 1.7, marginTop: 10 }}>Enrollment and recovery require an identity-provider integration; no MFA provider is configured here.</div>
        <div style={{ marginTop: 17 }}><span className="pill amber">Not configured</span></div>
      </article>
      <article className="panel panel-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div className="section-title">Audit events</div><Settings2 size={17} color="#b7791f" /></div>
        <div className="section-note" style={{ lineHeight: 1.7, marginTop: 10 }}>Account activation, deactivation, password resets, profile changes, and organization updates are recorded.</div>
        <div style={{ marginTop: 17 }}><span className="pill green">Supported changes recorded</span></div>
      </article>
    </div>

    <section className="panel panel-pad">
      <div className="panel-head">
        <div><div className="section-title">Application role definitions</div><div className="section-note">Roles and scopes implemented by this application; role changes are not edited on this page.</div></div>
        <UserCog size={18} color="var(--cyan)" />
      </div>
      <div className="table-wrap"><table><thead><tr><th>Role</th><th>Key</th><th>Scope</th><th>Responsibility</th></tr></thead><tbody>
        {roles.map((role) => <tr key={role.key}><td><div className="person-name">{role.name}</div></td><td><code style={{ fontSize: 10, color: "var(--cyan)" }}>{role.key}</code></td><td><span className="pill blue">{role.scope}</span></td><td style={{ whiteSpace: "normal", minWidth: 220, maxWidth: 420, lineHeight: 1.6, color: "#475467" }}>{role.description}</td></tr>)}
      </tbody></table></div>
    </section>

    <section className="panel panel-pad" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <div><div className="section-title">Deployment security checks</div><div className="section-note">Operator guidance only; this page does not inspect or verify hosting configuration.</div></div>
        <KeyRound size={17} color="#b7791f" />
      </div>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
        {deploymentChecks.map((item) => <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 11, color: "#475467", lineHeight: 1.6 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cyan)", flexShrink: 0, marginTop: 5 }} />{item}</li>)}
      </ul>
    </section>

    <TeamAssignmentManager />
    <p className="footer-note">Authorization is evaluated on the server. Team leads can access only records within their assigned teams.</p>
  </Page>;
}
