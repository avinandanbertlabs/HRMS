"use client";

import { useCallback, useEffect, useState } from "react";
import { Network, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { Page, PageHeading } from "@/components/ui/page";

type Team = {
  id: string;
  name: string;
  employeeCount: number;
  department: string | null;
  leadEmployee: { firstName: string; lastName: string; employeeCode: string } | null;
};
type Department = { id: string; name: string; businessUnit: string | null; employeeCount: number };
type OrganizationData = {
  company: { name: string };
  teams: Team[];
  departments: Department[];
  employeeCount: number;
  businessUnitCount: number;
};

export default function OrganizationPageClient() {
  const [data, setData] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [businessUnitName, setBusinessUnitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/teams", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load organization records.");
      setData(result as OrganizationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const response = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, departmentId: departmentId || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create the team.");
      setName("");
      setDepartmentId("");
      setShowForm(false);
      setNotice("Team created. Add employees and assign its lead to enable approvals.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the team.");
    } finally {
      setSaving(false);
    }
  }

  async function createDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingDepartment(true);
    try {
      const response = await fetch("/api/v1/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: departmentName,
          businessUnitName: businessUnitName || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create the department.");
      setDepartmentName("");
      setBusinessUnitName("");
      setShowDepartmentForm(false);
      setNotice("Department created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the department.");
    } finally {
      setSavingDepartment(false);
    }
  }

  return (
    <Page>
      <PageHeading
        eyebrow="ORGANIZATION"
        title="Organization structure"
        subtitle="Manage your company's departments and teams using current employee records."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
            <button className="button-secondary" onClick={() => setShowDepartmentForm((visible) => !visible)}><Plus size={15} /> Add department</button>
            <button className="button-primary" onClick={() => setShowForm((visible) => !visible)}><Plus size={15} /> Add team</button>
          </div>
        }
      />
      {error && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
      {notice && <div className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</div>}

      {showForm && <form className="panel panel-pad" onSubmit={createTeam} style={{ marginBottom: 18 }}>
        <div className="panel-head"><div><div className="section-title">Create a team</div><div className="section-note">Teams organize employee access and route leave approvals to their assigned lead.</div></div></div>
        <div className="form-grid">
          <label className="form-field"><span className="form-label">Team name</span><input className="field" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label className="form-field"><span className="form-label">Department (optional)</span><select className="field" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">No department</option>{data?.departments.map((department) => <option key={department.id} value={department.id}>{department.businessUnit ? `${department.businessUnit} · ` : ""}{department.name}</option>)}</select></label>
        </div>
        <div className="form-actions"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? "Saving…" : "Create team"}</button></div>
      </form>}
      {showDepartmentForm && <form className="panel panel-pad" onSubmit={createDepartment} style={{ marginBottom: 18 }}>
        <div className="panel-head"><div><div className="section-title">Create a department</div><div className="section-note">A business unit can be created at the same time when provided.</div></div></div>
        <div className="form-grid">
          <label className="form-field"><span className="form-label">Department name</span><input className="field" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label className="form-field"><span className="form-label">Business unit (optional)</span><input className="field" value={businessUnitName} onChange={(event) => setBusinessUnitName(event.target.value)} minLength={2} maxLength={80} /></label>
        </div>
        <div className="form-actions"><button type="button" className="button-secondary" onClick={() => setShowDepartmentForm(false)}>Cancel</button><button className="button-primary" disabled={savingDepartment}>{savingDepartment ? "Saving…" : "Create department"}</button></div>
      </form>}

      <div className="stat-grid">
        <div className="panel stat-card"><div className="stat-label">Business units</div><div className="stat-value">{loading ? "…" : data?.businessUnitCount ?? 0}</div><div className="stat-foot">Current company records</div></div>
        <div className="panel stat-card"><div className="stat-label">Departments</div><div className="stat-value">{loading ? "…" : data?.departments.length ?? 0}</div><div className="stat-foot">Current company records</div></div>
        <div className="panel stat-card"><div className="stat-label">Teams</div><div className="stat-value">{loading ? "…" : data?.teams.length ?? 0}</div><div className="stat-foot">Current company records</div></div>
        <div className="panel stat-card"><div className="stat-label">Employees</div><div className="stat-value">{loading ? "…" : data?.employeeCount ?? 0}</div><div className="stat-foot">Current employee profiles</div></div>
      </div>

      <section className="panel panel-pad" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div><div className="section-title">{data?.company.name ?? "Company"} organization</div><div className="section-note">Departments and teams shown here are read directly from the company database.</div></div>
          <span className="pill green"><ShieldCheck size={12} /> Company-scoped</span>
        </div>
        {loading ? <div className="empty-state">Loading organization records…</div> : !data?.departments.length
          ? <div className="empty-state">No departments have been created yet.</div>
          : <div className="three-col">{data.departments.map((department) => (
              <article className="panel panel-pad" key={department.id}>
                <div className="activity-dot"><Network size={16} /></div>
                <div className="section-title" style={{ marginTop: 12 }}>{department.name}</div>
                <div className="section-note">{department.businessUnit ?? "No business unit assigned"}</div>
                <div className="stat-foot" style={{ marginTop: 16 }}><Users size={13} /> {department.employeeCount} employees</div>
              </article>
            ))}</div>}
      </section>

      <section className="panel panel-pad">
        <div className="panel-head">
          <div><div className="section-title">Teams</div><div className="section-note">Each team&apos;s lead is assigned by an administrator.</div></div>
          <Link className="button-secondary" href="/admin">Manage team leads</Link>
        </div>
        {loading ? <div className="empty-state">Loading teams…</div> : !data?.teams.length
          ? <div className="empty-state">No teams exist yet. Create a team before adding employees.</div>
          : <div className="three-col">{data.teams.map((team) => (
              <article className="panel panel-pad" key={team.id}>
                <div style={{ height: 3, background: "var(--cyan)", borderRadius: 4, margin: "-20px -20px 16px" }} />
                <div className="section-title">{team.name}</div>
                <div className="section-note">{team.department ?? "No department assigned"}</div>
                <div className="stat-foot" style={{ marginTop: 16 }}><Users size={13} /> {team.employeeCount} employees</div>
                <div className="section-note" style={{ marginTop: 12 }}>{team.leadEmployee ? `Team lead: ${team.leadEmployee.firstName} ${team.leadEmployee.lastName}` : "No team lead assigned"}</div>
              </article>
            ))}</div>}
      </section>
    </Page>
  );
}
