"use client";
import { useCallback, useEffect, useState } from "react";
import { GitBranch, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

type Team = { id: string; name: string; departmentId: string | null; department: string | null; leadEmployee: { id: string; firstName: string; lastName: string; employeeCode: string; userId: string | null } | null; employeeCount: number };
type Candidate = { id: string; firstName: string; lastName: string; employeeCode: string; teamId: string | null; roles: string[] };
type Department = { id: string; name: string; businessUnit: string | null };
export function TeamAssignmentManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [newTeam, setNewTeam] = useState({ name: "", departmentId: "", leadEmployeeId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/teams", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load teams.");
      setTeams(data.teams ?? []);
      setEmployees(data.employees ?? []);
      setDepartments(data.departments ?? []);
      setSelection(Object.fromEntries((data.teams ?? []).map((team: Team) => [team.id, team.leadEmployee?.id ?? ""])));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load teams."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save(team: Team) {
    setSaving(team.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/teams/${team.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadEmployeeId: selection[team.id] || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update team lead.");
      setMessage(`Leave approver updated for ${team.name}.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update team lead."); }
    finally { setSaving(null); }
  }
  async function createTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving("new"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeam.name, departmentId: newTeam.departmentId || undefined, leadEmployeeId: newTeam.leadEmployeeId || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create team.");
      setMessage(`Team ${newTeam.name} created${newTeam.leadEmployeeId ? " and lead assigned as leave approver" : ""}.`);
      setNewTeam({ name: "", departmentId: "", leadEmployeeId: "" });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create team."); }
    finally { setSaving(null); }
  }
  async function deleteTeam(team: Team) {
    if (team.employeeCount) return;
    if (!window.confirm(`Delete the empty team "${team.name}"? This cannot be undone.`)) return;
    setSaving(team.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/teams", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: team.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete team.");
      setMessage(`Team ${team.name} deleted.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete team."); }
    finally { setSaving(null); }
  }
  const activeCandidates = employees.filter((employee) => employee.roles.length > 0);
  return <section className="panel panel-pad" style={{ marginTop: 18 }}>
    <div className="panel-head"><div><div className="section-title">Teams & leave approvers</div><div className="section-note">Create teams, assign members from Profiles & reporting, and set the team lead who approves their leave.</div></div><button className="button-secondary" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 12 }}>{error}</div>}{message && <div className="notice" role="status" style={{ marginBottom: 12 }}>{message}</div>}
    <form className="panel panel-pad" onSubmit={createTeam} style={{ marginBottom: 16, background: "var(--surface-2, #f8fafc)" }}>
      <div className="section-title" style={{ marginBottom: 10 }}>Create a team</div>
      <div className="form-grid">
        <label className="form-field"><span className="form-label">Team name</span><input className="field" value={newTeam.name} onChange={(event) => setNewTeam((old) => ({ ...old, name: event.target.value }))} required minLength={2} maxLength={80} placeholder="e.g. Product Operations" /></label>
        <label className="form-field"><span className="form-label">Department (optional)</span><select className="field" value={newTeam.departmentId} onChange={(event) => setNewTeam((old) => ({ ...old, departmentId: event.target.value }))}><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.businessUnit ? `${department.businessUnit} · ` : ""}{department.name}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Initial team lead / leave approver (optional)</span><select className="field" value={newTeam.leadEmployeeId} onChange={(event) => setNewTeam((old) => ({ ...old, leadEmployeeId: event.target.value }))}><option value="">Assign later</option>{activeCandidates.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}</select><span className="section-note">Selecting a lead moves their profile into this team and grants the Manager role.</span></label>
      </div>
      <div className="form-actions"><button className="button-primary" disabled={saving === "new" || loading}><Plus size={14} /> {saving === "new" ? "Creating…" : "Create team"}</button></div>
    </form>
    {loading ? <div className="empty-state">Loading team assignments…</div> : teams.length === 0 ? <div className="empty-state">No teams configured yet. Create the first team above.</div> : <div style={{ display: "grid", gap: 10 }}>{teams.map((team) => {
      const candidates = activeCandidates.filter((employee) => employee.teamId === team.id);
      return <div key={team.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px,1fr) minmax(220px,1.4fr) auto auto", gap: 12, alignItems: "center", padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="activity-dot"><GitBranch size={15} /></div><div><div className="person-name">{team.name}</div><div className="person-sub">{team.employeeCount} member(s) · {team.department ?? "No department"} · leave approver</div></div></div>
        <select className="field" aria-label={`Leave approver for ${team.name}`} value={selection[team.id] ?? ""} onChange={(event) => setSelection((old) => ({ ...old, [team.id]: event.target.value }))}><option value="">No leave approver</option>{candidates.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeCode}</option>)}</select>
        <button className="button-primary" disabled={saving === team.id} onClick={() => void save(team)}><Save size={14} /> {saving === team.id ? "Saving…" : "Save"}</button>
        <button className="button-secondary" disabled={saving === team.id || team.employeeCount > 0} title={team.employeeCount ? "Move all team members before deleting this team" : "Delete empty team"} onClick={() => void deleteTeam(team)}><Trash2 size={14} /> Delete</button>
      </div>;
    })}</div>}
    <p className="footer-note">Only employees with active login accounts can approve leave. Assign members and reporting lines in Profiles & reporting; teams with employees cannot be deleted.</p>
  </section>;
}
