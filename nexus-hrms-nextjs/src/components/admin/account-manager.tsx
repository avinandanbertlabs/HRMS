"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, Search, ShieldCheck, Trash2, UserRoundCog } from "lucide-react";

type EmployeeRecord = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  designation: { id: string; title: string } | null;
  reportsTo: { id: string; firstName: string; lastName: string; employeeCode: string } | null;
  ledTeams: { id: string; name: string }[];
  account: { id: string; email: string; isActive: boolean; mustChangePassword: boolean; roles: string[] } | null;
};
type HierarchyOption = { id: string; firstName: string; lastName: string; employeeCode: string; teamId: string | null };
type UnlinkedUser = { id: string; email: string; name: string; isActive: boolean; mustChangePassword: boolean; roles: string[] };
type Team = { id: string; name: string };
type AdminData = { employees: EmployeeRecord[]; unlinkedUsers: UnlinkedUser[]; hierarchyOptions: HierarchyOption[]; teams: Team[] };

export function AccountManager() {
  const [data, setData] = useState<AdminData | null>(null);
  const [edits, setEdits] = useState<Record<string, { teamId: string; reportsToId: string }>>({});
  const [query, setQuery] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; label: string } | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/accounts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load accounts.");
      setData(result as AdminData);
      setEdits(Object.fromEntries((result.employees as EmployeeRecord[]).map((employee) => [
        employee.id,
        { teamId: employee.teamId ?? "", reportsToId: employee.reportsTo?.id ?? "" },
      ])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredEmployees = useMemo(() => (data?.employees ?? []).filter((employee) =>
    `${employee.firstName} ${employee.lastName} ${employee.employeeCode} ${employee.account?.email ?? ""} ${employee.team?.name ?? ""}`
      .toLowerCase().includes(query.toLowerCase())), [data?.employees, query]);

  async function updateReporting(employee: EmployeeRecord) {
    const edit = edits[employee.id];
    if (!edit) return;
    setBusyId(employee.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: edit.teamId || null, reportsToId: edit.reportsToId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update reporting assignments.");
      setNotice(`Profile and reporting assignments saved for ${employee.firstName} ${employee.lastName}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update reporting assignments.");
    } finally {
      setBusyId("");
    }
  }

  async function accountAction(userId: string, action: "activate" | "deactivate") {
    setBusyId(userId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/accounts/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update account.");
      setNotice(`Account ${action === "activate" ? "activated" : "deactivated"}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update account.");
    } finally {
      setBusyId("");
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    setBusyId(passwordTarget.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/accounts/${passwordTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", temporaryPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to reset password.");
      setNotice(`Temporary password set for ${passwordTarget.label}. Share it securely. They must change it at next sign-in.`);
      setPasswordTarget(null);
      setTemporaryPassword("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reset password.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteUnlinkedAccount(user: UnlinkedUser) {
    if (!window.confirm(`Permanently delete unlinked account ${user.email}? This is allowed only when no history depends on it.`)) return;
    setBusyId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/accounts/${user.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete account.");
      setNotice("Unlinked account deleted.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete account.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteEmployeeProfile(employee: EmployeeRecord) {
    const label = `${employee.firstName} ${employee.lastName}`;
    if (!window.confirm(`Permanently delete ${label}'s profile${employee.account ? " and login credentials" : ""}? This is allowed only when no leave, approval, reporting, team-lead, identity-provider, or audit history depends on the records. If anything is linked, the server will reject deletion and the account can be deactivated instead.`)) return;
    setBusyId(employee.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/employees/${employee.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete employee profile.");
      setNotice(`${label}'s profile${employee.account ? " and login" : ""} deleted.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete employee profile.");
    } finally {
      setBusyId("");
    }
  }

  return <section className="panel panel-pad" style={{ marginTop: 18 }}>
    <div className="panel-head">
      <div><div className="section-title">Profiles, accounts & reporting</div><div className="section-note">Company-scoped records from the live database. Passwords are stored as hashes and can never be viewed.</div></div>
      <button type="button" className="button-secondary" onClick={() => void load()} aria-label="Refresh account list"><RefreshCw size={14} /> Refresh</button>
    </div>
    <div className="notice" style={{ marginBottom: 14 }}><strong>Secure password handling:</strong> Set a temporary password of at least 12 characters. It is saved as a hash, never returned or displayed again, and the user must replace it at their next login.</div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
    {notice && <div className="notice" role="status" style={{ marginBottom: 12 }}>{notice}</div>}
    <div className="toolbar" style={{ justifyContent: "space-between" }}>
      <div className="search-field"><Search size={15} className="search-icon" /><input className="field" placeholder="Find by name, employee ID, email or team…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <Link href="/employees" className="button-primary"><UserRoundCog size={15} /> Create employee profile</Link>
    </div>
    {loading ? <div className="empty-state">Loading profiles and accounts…</div> : <div className="table-wrap"><table>
      <thead><tr><th>Employee / login</th><th>Role & account</th><th>Team</th><th>Reports to</th><th>Profile</th><th>Account actions</th></tr></thead>
      <tbody>{filteredEmployees.map((employee) => {
        const edit = edits[employee.id] ?? { teamId: employee.teamId ?? "", reportsToId: employee.reportsTo?.id ?? "" };
        const roleText = employee.ledTeams.length ? `Team lead · ${employee.ledTeams.map((team) => team.name).join(", ")}` : employee.account?.roles.includes("HR_ADMIN") || employee.account?.roles.includes("SUPER_ADMIN") ? "Administrator" : "Employee";
        return <tr key={employee.id}>
          <td><div className="person-name">{employee.firstName} {employee.lastName}</div><div className="person-sub">{employee.employeeCode} · {employee.account?.email ?? "No login linked"} · {employee.department?.name ?? "No department"}{employee.designation?.title ? ` · ${employee.designation.title}` : ""}</div></td>
          <td>{employee.account ? <><div className="person-name">{roleText}</div><div className="person-sub">{employee.account.isActive ? "Login active" : "Login inactive"}{employee.account.mustChangePassword ? " · password change required" : ""}</div></> : <span className="pill amber">No account</span>}</td>
          <td><select className="field" aria-label={`Team for ${employee.firstName} ${employee.lastName}`} value={edit.teamId} onChange={(event) => setEdits((old) => ({ ...old, [employee.id]: { ...edit, teamId: event.target.value } }))}><option value="">No team</option>{(data?.teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></td>
          <td><select className="field" aria-label={`Reports to for ${employee.firstName} ${employee.lastName}`} value={edit.reportsToId} onChange={(event) => setEdits((old) => ({ ...old, [employee.id]: { ...edit, reportsToId: event.target.value } }))}><option value="">No reporting manager</option>{(data?.hierarchyOptions ?? []).filter((candidate) => candidate.id !== employee.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.firstName} {candidate.lastName} · {candidate.employeeCode}</option>)}</select><button type="button" className="button-secondary" style={{ marginTop: 6, minHeight: 32 }} disabled={busyId === employee.id} onClick={() => void updateReporting(employee)}>{busyId === employee.id ? "Saving…" : "Save hierarchy"}</button></td>
          <td><Link className="button-secondary" href={`/profile?employeeId=${encodeURIComponent(employee.id)}`}>Open profile</Link></td>
          <td>{employee.account ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button type="button" className="button-secondary" onClick={() => { setPasswordTarget({ id: employee.account!.id, label: `${employee.firstName} ${employee.lastName}` }); setTemporaryPassword(""); }}><KeyRound size={13} /> Reset password</button>
            <button type="button" className="button-secondary" disabled={busyId === employee.account.id} onClick={() => void accountAction(employee.account!.id, employee.account!.isActive ? "deactivate" : "activate")}>{employee.account.isActive ? "Deactivate" : "Activate"}</button>
            <button type="button" className="button-secondary" disabled={busyId === employee.id} onClick={() => void deleteEmployeeProfile(employee)}><Trash2 size={13} /> Delete safely</button>
          </div> : <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><span className="person-sub">No login linked</span><button type="button" className="button-secondary" disabled={busyId === employee.id} onClick={() => void deleteEmployeeProfile(employee)}><Trash2 size={13} /> Delete safely</button></div>}</td>
        </tr>;
      })}</tbody>
    </table>{filteredEmployees.length === 0 && <div className="empty-state">No employee profiles match this search.</div>}</div>}
    {!!data?.unlinkedUsers.length && <div style={{ marginTop: 20 }}>
      <div className="section-title" style={{ marginBottom: 9 }}>Unlinked login accounts <span className="section-note">({data.unlinkedUsers.length})</span></div>
      <div className="table-wrap"><table><thead><tr><th>Account</th><th>Roles</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {data.unlinkedUsers.map((user) => <tr key={user.id}><td><div className="person-name">{user.name}</div><div className="person-sub">{user.email}</div></td><td>{user.roles.join(", ") || "No role"}</td><td><span className={`pill ${user.isActive ? "green" : "red"}`}>{user.isActive ? "Active" : "Inactive"}</span>{user.mustChangePassword && <div className="person-sub">Password change required</div>}</td><td><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><button type="button" className="button-secondary" onClick={() => { setPasswordTarget({ id: user.id, label: user.email }); setTemporaryPassword(""); }}><KeyRound size={13} /> Reset password</button><button type="button" className="button-secondary" disabled={busyId === user.id} onClick={() => void accountAction(user.id, user.isActive ? "deactivate" : "activate")}>{user.isActive ? "Deactivate" : "Activate"}</button><button type="button" className="button-secondary" disabled={busyId === user.id} onClick={() => void deleteUnlinkedAccount(user)}>Delete safely</button></div></td></tr>)}
      </tbody></table></div>
    </div>}
    <div className="footer-note"><ShieldCheck size={13} /> Changes are company-scoped and audited. Linked profiles and accounts with history are deactivated, not deleted. Team-lead roles are managed in the team assignment section below.</div>
    {passwordTarget && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordTarget(null); }} style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 20, background: "rgba(3, 7, 18, .72)", backdropFilter: "blur(8px)" }}>
      <form role="dialog" aria-modal="true" aria-labelledby="reset-password-title" className="panel panel-pad" onSubmit={resetPassword} style={{ width: "min(100%, 460px)" }}>
        <div className="eyebrow">ACCOUNT SECURITY</div><h2 id="reset-password-title" className="section-title" style={{ margin: "8px 0" }}>Set temporary password</h2>
        <p className="section-note" style={{ lineHeight: 1.6 }}>For {passwordTarget.label}. This password is not emailed or shown again after saving. Share it through an approved secure channel.</p>
        <label className="form-field" style={{ marginTop: 16 }}><span className="form-label">Temporary password (12–128 characters)</span><input className="field" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} required autoFocus /></label>
        <div className="form-actions"><button type="button" className="button-secondary" disabled={busyId === passwordTarget.id} onClick={() => setPasswordTarget(null)}>Cancel</button><button className="button-primary" disabled={busyId === passwordTarget.id}>{busyId === passwordTarget.id ? "Saving…" : "Set temporary password"}</button></div>
      </form>
    </div>}
  </section>;
}
