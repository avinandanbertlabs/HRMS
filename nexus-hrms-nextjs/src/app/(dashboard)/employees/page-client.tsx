"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Users } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";

type Team = { id: string; name: string; leadEmployee?: { id: string } | null; employeeCount?: number };
type Department = { id: string; name: string; businessUnit: string | null };
type Employee = { id: string; employeeCode: string; firstName: string; lastName: string; email: string; status: string; totalLeaveTaken: number; team: Team | null; department: { name: string } | null; designation: { title: string } | null };
export default function Employees() {
  const [rows, setRows] = useState<Employee[]>([]); const [teams, setTeams] = useState<Team[]>([]); const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState(""); const [showForm, setShowForm] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ employeeCode: "", firstName: "", lastName: "", email: "", teamId: "", departmentId: "", initialPassword: "", accountMode: "CREATE", accountRole: "EMPLOYEE" });
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [employeeResponse, teamResponse] = await Promise.all([fetch("/api/v1/employees?limit=100", { cache: "no-store" }), fetch("/api/v1/teams", { cache: "no-store" })]);
      const employeeJson = await employeeResponse.json(); const teamJson = await teamResponse.json();
      if (!employeeResponse.ok) throw new Error(employeeJson.error ?? "Unable to load employees.");
      if (!teamResponse.ok) throw new Error(teamJson.error ?? "Unable to load organization assignments.");
      setRows(employeeJson.data ?? []); setTeams(teamJson.teams ?? []); setDepartments(teamJson.departments ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load employees."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = rows.filter((employee) => `${employee.firstName} ${employee.lastName} ${employee.employeeCode} ${employee.email} ${employee.team?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((old) => ({ ...old, [key]: value })); }
  async function createEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try {
      const response = await fetch("/api/v1/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, teamId: form.teamId || undefined, departmentId: form.departmentId || undefined, initialPassword: form.accountMode === "CREATE" ? form.initialPassword : undefined }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not create employee.");
      setNotice(form.accountMode === "CREATE" ? "Employee and login account created. Share the temporary password securely; the employee must change it at first sign-in." : "Employee profile linked to the existing login account.");
      setForm({ employeeCode: "", firstName: "", lastName: "", email: "", teamId: "", departmentId: "", initialPassword: "", accountMode: "CREATE", accountRole: "EMPLOYEE" }); setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create employee."); }
    finally { setSaving(false); }
  }
  return <Page>
    <PageHeading eyebrow="PEOPLE DIRECTORY" title="Employee directory" subtitle="Create employee profiles, assign an approval group and department, and provision role-based login accounts." action={<div style={{ display: "flex", gap: 8 }}><button className="button-secondary" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button><button className="button-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Add employee</button></div>} />
    {error && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{error}</div>}{notice && <div className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
    {showForm && <form className="panel panel-pad" onSubmit={createEmployee} style={{ marginBottom: 18 }}><div className="panel-head"><div><div className="section-title">{form.accountMode === "CREATE" ? "Create employee and login" : "Link employee to an existing login"}</div><div className="section-note">{form.accountMode === "CREATE" ? "The team determines leave routing; assign a team lead from Access & policies after creating the profile." : "Enter the exact email of an active, unlinked login account in this company. The team determines leave routing."}</div></div></div>
      <div className="form-grid">
        <label className="form-field"><span className="form-label">Login account</span><select className="field" value={form.accountMode} onChange={(e) => update("accountMode", e.target.value)}><option value="CREATE">Create a new login</option><option value="LINK_EXISTING">Link an existing login</option></select></label>
        {form.accountMode === "CREATE" && <label className="form-field"><span className="form-label">Initial account role</span><select className="field" value={form.accountRole} onChange={(e) => update("accountRole", e.target.value)}><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager / team lead candidate</option></select><span className="section-note">Assigning this employee as a team&apos;s leave approver also grants the Manager role.</span></label>}
        <label className="form-field"><span className="form-label">Employee ID</span><input className="field" value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} required placeholder="BL-1006" /></label>
        <label className="form-field"><span className="form-label">Approval group / Team</span><select className="field" value={form.teamId} onChange={(e) => update("teamId", e.target.value)} required><option value="">Select approval group</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Department</span><select className="field" value={form.departmentId} onChange={(e) => update("departmentId", e.target.value)}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.businessUnit ? `${department.businessUnit} · ` : ""}{department.name}</option>)}</select></label>
        <label className="form-field"><span className="form-label">First name</span><input className="field" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required /></label>
        <label className="form-field"><span className="form-label">Last name</span><input className="field" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required /></label>
        <label className="form-field"><span className="form-label">Login email</span><input className="field" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
        {form.accountMode === "CREATE" && <label className="form-field"><span className="form-label">Temporary password (12+ characters)</span><input className="field" type="password" autoComplete="new-password" minLength={12} value={form.initialPassword} onChange={(e) => update("initialPassword", e.target.value)} placeholder="At least 12 characters" required /><span className="section-note">The employee must change this password at first sign-in.</span></label>}
      </div><div className="form-actions"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? "Saving…" : form.accountMode === "CREATE" ? "Create employee" : "Link employee profile"}</button></div>
    </form>}
    <div className="stat-grid"><div className="panel stat-card"><div className="stat-label">Employee profiles in view</div><div className="stat-value">{rows.length.toString().padStart(2, "0")}</div><div className="stat-foot">Company directory</div></div><div className="panel stat-card"><div className="stat-label">Assigned teams</div><div className="stat-value">{new Set(rows.map((employee) => employee.team?.id).filter(Boolean)).size.toString().padStart(2, "0")}</div><div className="stat-foot">From employee records</div></div><div className="panel stat-card"><div className="stat-label">Active employees</div><div className="stat-value">{rows.filter((employee) => employee.status === "ACTIVE").length.toString().padStart(2, "0")}</div><div className="stat-foot">Current employee status</div></div><div className="panel stat-card"><div className="stat-label">Team leads</div><div className="stat-value">{teams.filter((team) => Boolean(team.leadEmployee)).length.toString().padStart(2, "0")}</div><div className="stat-foot">See team assignments in Access & policies</div></div></div>
    <section className="panel panel-pad" style={{ marginTop: 18 }}><div className="panel-head"><div><div className="section-title">Employees <span style={{ color: "#667085", fontWeight: 400 }}>({filtered.length})</span></div><div className="section-note">Employee records visible to company admins.</div></div><Users size={18} color="var(--cyan)" /></div>
      <div className="toolbar"><div className="search-field"><Search size={15} className="search-icon" /><input className="field" placeholder="Search name, ID, email or team…" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {loading ? <div className="empty-state">Loading employees…</div> : <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Team</th><th>Department</th><th>Designation</th><th>Total leave taken</th><th>Status</th></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td><div className="person-cell"><div className="person-avatar">{employee.firstName[0] ?? ""}{employee.lastName[0] ?? ""}</div><div><Link href={`/profile?employeeId=${encodeURIComponent(employee.id)}`} className="person-name">{employee.firstName} {employee.lastName}</Link><div className="person-sub">{employee.email}</div></div></div></td><td>{employee.employeeCode}</td><td>{employee.team?.name ?? "Unassigned"}</td><td>{employee.department?.name ?? "—"}</td><td>{employee.designation?.title ?? "—"}</td><td>{employee.totalLeaveTaken} days</td><td><StatusPill status={employee.status} /></td></tr>)}</tbody></table>{!filtered.length && <div className="empty-state">{rows.length ? "No matching employees." : "No employee profiles found. Add employees to start configuring teams."}</div>}</div>}
    </section><p className="footer-note">Employee accounts are assigned roles server-side. Approval-group membership and department are stored on the employee profile; the leave form cannot choose or override the approver.</p>
  </Page>;
}
