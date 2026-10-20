"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save, UserRound } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";

type PersonOption = { id: string; firstName: string; lastName: string; employeeCode: string };
type Profile = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  workEmail: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  location: string | null;
  joinedAt: string | null;
  status: string;
  totalLeaveTaken: number;
  team: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  designation: { id: string; title: string } | null;
  reportsTo: PersonOption | null;
};
type PageData = {
  data: Profile;
  options: {
    departments: { id: string; name: string }[];
    designations: { id: string; title: string }[];
    teams: { id: string; name: string }[];
    reportingEmployees: PersonOption[];
  };
  access: { isSelf: boolean; canEdit: boolean; canEditWorkDetails: boolean; canEditTeam: boolean };
};
type FormState = {
  firstName: string; lastName: string; workEmail: string; phone: string; dateOfBirth: string; location: string; joinedAt: string;
  departmentId: string; designationId: string; reportsToId: string; teamId: string;
};

const dateValue = (value: string | null) => value?.slice(0, 10) ?? "";
const displayDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${dateValue(value)}T12:00:00`))
  : "Not provided";
const personName = (person: PersonOption | null) => person ? `${person.firstName} ${person.lastName}`.trim() : "Not assigned";

export default function ProfileClient({ employeeId }: { employeeId: string | null }) {
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const targetId = employeeId ?? "me";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/employees/${encodeURIComponent(targetId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load this employee profile.");
      const profilePage = result as PageData;
      setPage(profilePage);
      setForm({
        firstName: profilePage.data.firstName,
        lastName: profilePage.data.lastName,
        workEmail: profilePage.data.workEmail ?? "",
        phone: profilePage.data.phone ?? "",
        dateOfBirth: dateValue(profilePage.data.dateOfBirth),
        location: profilePage.data.location ?? "",
        joinedAt: dateValue(profilePage.data.joinedAt),
        departmentId: profilePage.data.department?.id ?? "",
        designationId: profilePage.data.designation?.id ?? "",
        reportsToId: profilePage.data.reportsTo?.id ?? "",
        teamId: profilePage.data.team?.id ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this employee profile.");
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError("");
    setNotice("");
    setSaving(true);
    const payload: Record<string, string | null> = {
      firstName: form.firstName,
      lastName: form.lastName,
      workEmail: form.workEmail,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth || null,
      location: form.location,
    };
    if (page?.access.canEditWorkDetails) {
      payload.joinedAt = form.joinedAt || null;
      payload.departmentId = form.departmentId || null;
      payload.designationId = form.designationId || null;
      payload.reportsToId = form.reportsToId || null;
    }
    if (page?.access.canEditTeam) payload.teamId = form.teamId || null;
    try {
      const response = await fetch(`/api/v1/employees/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save this profile.");
      setNotice("Profile changes saved.");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this profile.");
    } finally {
      setSaving(false);
    }
  }

  const profile = page?.data;
  return <Page>
    <PageHeading eyebrow="EMPLOYEE PROFILE" title={profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Employee profile"} subtitle={page?.access.isSelf ? "Review and update your profile. Login email, employee number, team assignment, and password are protected." : "Employee details and approved leave totals for your authorized team scope."} action={<button className="button-secondary" onClick={() => void load()} aria-label="Refresh employee profile"><RefreshCw size={15} /> Refresh</button>} />
    {error && <div className="notice" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
    {notice && <div className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
    {loading && <div className="empty-state">Loading employee profile…</div>}
    {!loading && profile && form && <>
      <div className="stat-grid">
        <div className="panel stat-card"><div className="stat-label">Employee number</div><div className="stat-value">{profile.employeeCode}</div><div className="stat-foot">Fixed employee identifier</div></div>
        <div className="panel stat-card"><div className="stat-label">Total approved leave taken</div><div className="stat-value">{profile.totalLeaveTaken.toLocaleString("en-IN")}</div><div className="stat-foot">Working days across approved requests</div></div>
        <div className="panel stat-card"><div className="stat-label">Employment status</div><div className="stat-value" style={{ fontSize: 18 }}>{profile.status.replaceAll("_", " ")}</div><div className="stat-foot">Current profile status</div></div>
      </div>
      <section className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="panel-head"><div><div className="section-title">Profile details</div><div className="section-note">{page.access.canEdit ? "Edit the available fields and save your changes." : "You can view this profile but cannot edit it."}</div></div><UserRound size={18} color="var(--cyan)" /></div>
        {page.access.canEdit ? <form onSubmit={save}>
          <div className="form-grid">
            <label className="form-field"><span className="form-label">First name</span><input className="field" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={80} required /></label>
            <label className="form-field"><span className="form-label">Last name</span><input className="field" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={80} /></label>
            <label className="form-field"><span className="form-label">Login email / user ID</span><input className="field" value={profile.email} readOnly disabled /></label>
            <label className="form-field"><span className="form-label">Work email</span><input className="field" type="email" value={form.workEmail} onChange={(event) => setForm({ ...form, workEmail: event.target.value })} maxLength={254} /></label>
            <label className="form-field"><span className="form-label">Contact number</span><input className="field" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={32} /></label>
            <label className="form-field"><span className="form-label">Date of birth</span><input className="field" type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} max={new Date().toISOString().slice(0, 10)} /></label>
            <label className="form-field"><span className="form-label">Location</span><input className="field" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={120} /></label>
            {page.access.canEditWorkDetails && <>
              <label className="form-field"><span className="form-label">Department</span><select className="field" value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}><option value="">Not assigned</option>{page.options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="form-field"><span className="form-label">Designation</span><select className="field" value={form.designationId} onChange={(event) => setForm({ ...form, designationId: event.target.value })}><option value="">Not assigned</option>{page.options.designations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              <label className="form-field"><span className="form-label">Reports to</span><select className="field" value={form.reportsToId} onChange={(event) => setForm({ ...form, reportsToId: event.target.value })}><option value="">Not assigned</option>{page.options.reportingEmployees.map((item) => <option key={item.id} value={item.id}>{personName(item)} · {item.employeeCode}</option>)}</select></label>
              <label className="form-field"><span className="form-label">Joining date</span><input className="field" type="date" value={form.joinedAt} onChange={(event) => setForm({ ...form, joinedAt: event.target.value })} /></label>
            </>}
            {page.access.canEditTeam && <label className="form-field"><span className="form-label">Team</span><select className="field" value={form.teamId} onChange={(event) => setForm({ ...form, teamId: event.target.value })}><option value="">Not assigned</option>{page.options.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {!page.access.canEditTeam && <label className="form-field"><span className="form-label">Team</span><input className="field" value={profile.team?.name ?? "Not assigned"} readOnly disabled /></label>}
          </div>
          <div className="form-actions"><button className="button-primary" disabled={saving}>{saving ? "Saving…" : <><Save size={15} /> Save profile</>}</button></div>
        </form> : <div className="three-col">
          <div><div className="form-label">Date of birth</div><div>{displayDate(profile.dateOfBirth)}</div></div>
          <div><div className="form-label">Contact number</div><div>{profile.phone || "Not provided"}</div></div>
          <div><div className="form-label">Designation</div><div>{profile.designation?.title ?? "Not assigned"}</div></div>
          <div><div className="form-label">Department</div><div>{profile.department?.name ?? "Not assigned"}</div></div>
          <div><div className="form-label">Reports to</div><div>{personName(profile.reportsTo)}</div></div>
          <div><div className="form-label">Team</div><div>{profile.team?.name ?? "Not assigned"}</div></div>
          <div><div className="form-label">Joining date</div><div>{displayDate(profile.joinedAt)}</div></div>
          <div><div className="form-label">Location</div><div>{profile.location || "Not provided"}</div></div>
          <div><div className="form-label">Work email</div><div>{profile.workEmail || "Not provided"}</div></div>
        </div>}
        <p className="footer-note">Login email / user ID, employee number, team assignment, employment status, and password are protected. Team leads may update work details for employees in teams they lead.</p>
      </section>
    </>}
  </Page>;
}
