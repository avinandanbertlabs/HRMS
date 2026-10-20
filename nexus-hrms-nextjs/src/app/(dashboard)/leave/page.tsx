"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";
import { countWorkingDays, dateDaysBefore, indiaCalendarDate } from "@/lib/leave/working-days";
import { countWords } from "@/lib/validation/word-count";

type LeaveType = { id: string; name: string; code: string; paid: boolean };
type LeaveRow = {
  id: string;
  startDate: string;
  endDate: string;
  partialStartTime: string | null;
  partialEndTime: string | null;
  units: string | number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  comments?: string | null;
  createdAt: string;
  leaveType: LeaveType;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string; team: { id: string; name: string } | null };
};
type PageData = {
  data: LeaveRow[];
  leaveTypes: LeaveType[];
  balances: { id: string; available: string | number; leaveType: { name: string; code: string } }[];
  holidays: string[];
  access: { level: "ADMIN" | "MANAGER" | "EMPLOYEE"; canApply: boolean; canApprove: boolean; teamName: string | null; scopeLabel: string; applicantName?: string; applicantEmployeeId: string | null; isTeamLead: boolean };
};

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
const statusLabel: Record<LeaveRow["status"], string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Cancelled" };
const emptyRows: LeaveRow[] = [];

export default function LeavePage() {
  const [page, setPage] = useState<PageData | null>(null);
  const [tab, setTab] = useState("ALL");
  const [managerView, setManagerView] = useState<"MINE" | "TEAM">("MINE");
  const [showForm, setShowForm] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partialDay, setPartialDay] = useState(false);
  const [partialStartTime, setPartialStartTime] = useState("");
  const [partialEndTime, setPartialEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<{ row: LeaveRow; action: "APPROVED" | "REJECTED" } | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/leave", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load leave requests.");
      setPage(result as PageData);
      setLeaveTypeId((current) => current || result.leaveTypes?.[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rows = page?.data ?? emptyRows;
  const level = page?.access.level;
  const scopedRows = level === "MANAGER"
    ? rows.filter((row) => managerView === "MINE"
      ? row.employee.id === page?.access.applicantEmployeeId
      : row.employee.id !== page?.access.applicantEmployeeId)
    : rows;
  const visible = useMemo(() => scopedRows.filter((row) => tab === "ALL" || row.status === tab), [scopedRows, tab]);
  const showDecisionColumn = Boolean(page?.access.canApprove && !(level === "MANAGER" && managerView === "MINE"));
  const pending = rows.filter((row) => row.status === "PENDING").length;
  const selectedLeaveType = page?.leaveTypes.find((type) => type.id === leaveTypeId);
  const sickLeave = selectedLeaveType?.code.toUpperCase() === "SICK";
  const startDateMin = sickLeave ? dateDaysBefore(indiaCalendarDate(), 7) : indiaCalendarDate();
  const workingDays = startDate && endDate && endDate >= startDate
    ? countWorkingDays(new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T00:00:00.000Z`), new Set(page?.holidays ?? []))
    : 0;
  const partialDurationMinutes = partialStartTime && partialEndTime
    ? (() => {
        const [startHour, startMinute] = partialStartTime.split(":").map(Number);
        const [endHour, endMinute] = partialEndTime.split(":").map(Number);
        return endHour * 60 + endMinute - (startHour * 60 + startMinute);
      })()
    : 0;
  const partialUnits = partialDurationMinutes > 0 && partialDurationMinutes <= 480
    ? Math.round((partialDurationMinutes / 480) * 100) / 100
    : 0;
  const requestedUnits = partialDay ? partialUnits : workingDays;

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!leaveTypeId || !startDate || !endDate || endDate < startDate || reason.trim().length < 5) {
      setError("Choose a leave type, valid dates, and a reason of at least 5 characters."); return;
    }
    if (countWords(reason) > 500) {
      setError("Leave reason must be 500 words or fewer."); return;
    }
    if (partialDay && (!partialStartTime || !partialEndTime || partialDurationMinutes <= 0 || partialDurationMinutes > 480)) {
      setError("Enter a valid time range of up to 8 working hours for the partial-day request."); return;
    }
    if (partialDay && startDate !== endDate) {
      setError("Partial-day leave must be for one date only."); return;
    }
    const units = requestedUnits;
    if (partialDay ? units <= 0 : units < 1) { setError("The selected range contains no working days."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/leave", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId,
          startDate,
          endDate,
          ...(partialDay ? { partialStartTime, partialEndTime } : {}),
          reason: reason.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not submit the leave request.");
      setShowForm(false); setReason(""); setStartDate(""); setEndDate(""); setPartialDay(false); setPartialStartTime(""); setPartialEndTime("");
      setNotice("Leave request submitted. It has been routed using your assigned team and reporting setup.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the leave request.");
    } finally { setSaving(false); }
  }

  function openDecision(row: LeaveRow, action: "APPROVED" | "REJECTED") {
    setDecision({ row, action });
    setDecisionComment("");
    setDecisionError("");
    setError("");
    setNotice("");
  }

  async function decide() {
    if (!decision) return;
    const { row, action } = decision;
    if (action === "REJECTED" && !decisionComment.trim()) {
      setDecisionError("Add a reason before rejecting this leave request.");
      return;
    }
    if (countWords(decisionComment) > 500) {
      setDecisionError("Decision note must be 500 words or fewer.");
      return;
    }
    setError(""); setNotice(""); setDecisionError(""); setSavingDecision(true);
    try {
      const response = await fetch(`/api/v1/leave/${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: decisionComment.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update this request.");
      setNotice(`Request ${action === "APPROVED" ? "approved" : "rejected"}.`);
      setDecision(null);
      setDecisionComment("");
      await load();
    } catch (err) { setDecisionError(err instanceof Error ? err.message : "Unable to update this request."); }
    finally { setSavingDecision(false); }
  }

  const title = level === "ADMIN" ? "Company leave management" : level === "MANAGER" ? "Team leave approvals" : "My leave";
  const subtitle = level === "ADMIN"
    ? "Review leave requests across the company. Admin access is company-wide."
    : level === "MANAGER"
      ? `Review requests for your assigned team${page?.access.teamName ? ` · ${page.access.teamName}` : ""}, and view your own leave requests. Requests from other teams are not visible.`
      : "Apply for leave and track only your own requests and decisions.";

  return <Page>
    <PageHeading eyebrow="LEAVE & TIME OFF" title={title} subtitle={subtitle} action={<div style={{ display: "flex", gap: 8 }}><button className="button-secondary" onClick={() => void load()} aria-label="Refresh leave requests"><RefreshCw size={15} /> Refresh</button>{page?.access.canApply && <button className="button-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Request leave</button>}</div>} />

    {error && <div className="notice" role="alert" style={{ marginBottom: 14, borderColor: "#f1c5ca", color: "#8f1724" }}>{error}</div>}
    {notice && <div className="notice" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
    <div className="notice" style={{ marginBottom: 18 }}><strong>Access scope:</strong> {page?.access.scopeLabel ?? "Checking your access…"} The team and approver are determined from your assigned employee profile, not from a name typed into this form.</div>

    {showForm && page?.access.canApply && <form className="panel panel-pad" onSubmit={submitRequest} style={{ marginBottom: 18 }}>
      <div className="panel-head"><div><div className="section-title">New leave request</div><div className="section-note">{page.access.isTeamLead ? "Your request will be routed to an independent company admin. Team leads cannot approve or reject their own leave." : "The system sends the request to the lead assigned to your team."}</div></div></div>
      <div className="form-grid">
        <label className="form-field"><span className="form-label">Applicant full name</span><input className="field" value={page.access.applicantName ?? "Signed-in employee"} readOnly aria-label="Applicant full name" /></label>
        <label className="form-field"><span className="form-label">Leave type</span><select className="field" value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required><option value="">Select leave type</option>{(page.leaveTypes ?? []).map((type) => <option value={type.id} key={type.id}>{type.name}{type.paid ? " · Paid" : " · Unpaid"}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Start date</span><input className="field" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (partialDay) setEndDate(event.target.value); }} min={startDateMin} required />{sickLeave && <span className="section-note">Sick leave may be backdated by up to 7 calendar days.</span>}</label>
        <label className="form-field"><span className="form-label">End date</span><input className="field" type="date" value={endDate} min={startDate || startDateMin} onChange={(event) => setEndDate(event.target.value)} required disabled={partialDay} /></label>
        <label className="form-field form-span" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 14, border: "1px solid var(--line)", borderRadius: 12 }}>
          <input type="checkbox" checked={partialDay} onChange={(event) => { const enabled = event.target.checked; setPartialDay(enabled); if (enabled && startDate) setEndDate(startDate); }} aria-label="Request partial-day leave" style={{ marginTop: 3, accentColor: "#b42332" }} />
          <span><strong className="form-label">This is a partial-day or early-departure request (optional)</strong><span className="section-note" style={{ display: "block" }}>Enter the time period only when you need less than a full working day. One working day is calculated as 8 hours.</span></span>
        </label>
        {partialDay && <>
          <label className="form-field"><span className="form-label">Leave starts at</span><input className="field" type="time" value={partialStartTime} onChange={(event) => setPartialStartTime(event.target.value)} required /></label>
          <label className="form-field"><span className="form-label">Leave ends at</span><input className="field" type="time" value={partialEndTime} onChange={(event) => setPartialEndTime(event.target.value)} required /></label>
        </>}
        <label className="form-field"><span className="form-label">{partialDay ? "Leave requested" : "Working days requested"}</span><input className="field" value={partialDay ? `${requestedUnits ? requestedUnits.toFixed(2) : "—"} days · ${partialDurationMinutes > 0 ? `${(partialDurationMinutes / 60).toFixed(2)} hours` : "enter times"}` : startDate && endDate && endDate >= startDate ? String(workingDays) : "—"} readOnly aria-label="Calculated working days" /></label>
        <label className="form-field form-span"><span className="form-label">Reason</span><textarea className="field" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={10000} rows={3} placeholder="Add a short explanation for your manager" required /><span className="section-note">{countWords(reason)} / 500 words</span></label>
      </div>
      <div className="form-actions"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? "Submitting…" : "Submit request"}</button></div>
    </form>}

    <div className="stat-grid">
      <div className="panel stat-card"><div className="stat-label">{level === "EMPLOYEE" ? "My requests" : "Requests in scope"}</div><div className="stat-value">{rows.length.toString().padStart(2, "0")}</div><div className="stat-foot">Only records allowed by your role</div></div>
      <div className="panel stat-card"><div className="stat-label">Pending</div><div className="stat-value">{pending.toString().padStart(2, "0")}</div><div className="stat-foot"><Clock3 size={13} /> Awaiting a decision</div></div>
      <div className="panel stat-card"><div className="stat-label">Approved</div><div className="stat-value">{rows.filter((row) => row.status === "APPROVED").length.toString().padStart(2, "0")}</div><div className="stat-foot">Confirmed leave requests</div></div>
      <div className="panel stat-card"><div className="stat-label">Available leave balance</div><div className="stat-value">{page?.balances?.reduce((sum, balance) => sum + Number(balance.available), 0).toFixed(1) ?? "—"}</div><div className="stat-foot">Your current-year balance</div></div>
    </div>

    <section className="panel panel-pad" style={{ marginTop: 18 }}>
      <div className="panel-head"><div><div className="section-title">{level === "EMPLOYEE" || (level === "MANAGER" && managerView === "MINE") ? "My leave requests" : level === "MANAGER" ? "My team's requests" : "All company requests"}</div><div className="section-note">{level === "MANAGER" && managerView === "MINE" ? "Track the status and decision notes for your own requests. Another reviewer must decide them." : page?.access.canApprove ? "Approve or reject requests in your review scope. You cannot decide your own leave request." : "You can view and track only your own requests."}</div></div><CalendarDays size={18} color="var(--cyan)" /></div>
      {level === "MANAGER" && <div className="toolbar" aria-label="Leave request section">
        {[{ label: "My leaves", value: "MINE" as const }, { label: "Team requests", value: "TEAM" as const }].map((item) => <button key={item.value} type="button" aria-pressed={managerView === item.value} className={managerView === item.value ? "button-primary" : "button-secondary"} style={{ padding: "8px 12px", minHeight: 34, fontSize: 11 }} onClick={() => { setManagerView(item.value); setTab("ALL"); }}>{item.label}</button>)}
      </div>}
      <div className="toolbar">{[{label:"All",value:"ALL"},{label:"Pending",value:"PENDING"},{label:"Approved",value:"APPROVED"},{label:"Rejected",value:"REJECTED"}].map((item) => <button key={item.value} className={tab === item.value ? "button-primary" : "button-secondary"} style={{ padding: "8px 12px", minHeight: 34, fontSize: 11 }} onClick={() => setTab(item.value)}>{item.label}</button>)}</div>
      {loading ? <div className="empty-state">Loading your authorized leave data…</div> : <div className="table-wrap"><table><thead><tr><th>Applicant full name</th>{level !== "EMPLOYEE" && <th>Employee / team</th>}<th>Leave type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th>{showDecisionColumn && <th>Decision</th>}</tr></thead><tbody>
        {visible.map((row) => <tr key={row.id}><td><div className="person-name">{row.employee.firstName} {row.employee.lastName}</div></td>{level !== "EMPLOYEE" && <td><div className="person-cell"><div className="person-avatar">{row.employee.firstName[0] ?? ""}{row.employee.lastName[0] ?? ""}</div><div><div className="person-name">{row.employee.employeeCode}</div><div className="person-sub">{row.employee.team?.name ?? "No team assigned"}</div></div></div></td>}<td><div className="person-name">{row.leaveType.name}</div><div className="person-sub">{row.leaveType.paid ? "Paid leave" : "Unpaid leave"}</div></td><td>{dateLabel(row.startDate)} – {dateLabel(row.endDate)}{row.partialStartTime && row.partialEndTime && <div className="person-sub">{row.partialStartTime}–{row.partialEndTime} · partial day</div>}</td><td>{Number(row.units)} {Number(row.units) === 1 ? "day" : "days"}</td><td style={{ whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word", verticalAlign: "top", minWidth: 150, maxWidth: 250, width: 250 }}><div style={{ maxHeight: 160, overflowY: "auto", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>{row.reason}{row.comments && <div className="person-sub" style={{ whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>Decision note: {row.comments}</div>}</div></td><td><span className={`pill ${row.status === "APPROVED" ? "green" : row.status === "REJECTED" ? "red" : row.status === "PENDING" ? "amber" : "blue"}`}>{statusLabel[row.status]}</span></td>{showDecisionColumn && <td>{row.employee.id === page?.access.applicantEmployeeId ? <span className="person-sub">Independent review</span> : row.status === "PENDING" ? <div style={{ display: "flex", gap: 6 }}><button className="icon-button" title="Approve request" aria-label={`Approve leave for ${row.employee.firstName} ${row.employee.lastName}`} onClick={() => openDecision(row, "APPROVED")}><Check size={15} /></button><button className="icon-button" title="Reject request" aria-label={`Reject leave for ${row.employee.firstName} ${row.employee.lastName}`} onClick={() => openDecision(row, "REJECTED")}><X size={15} /></button></div> : row.status === "APPROVED" ? <button className="icon-button" title="Reject approved leave" aria-label={`Reject approved leave for ${row.employee.firstName} ${row.employee.lastName}`} onClick={() => openDecision(row, "REJECTED")}><X size={15} /></button> : <span style={{ color: "#98a2b3" }}>—</span>}</td>}</tr>)}
      </tbody></table>{visible.length === 0 && <div className="empty-state">{level === "MANAGER" && managerView === "MINE" ? "You have not submitted any leave requests yet." : level === "MANAGER" && !page?.access.teamName ? "No team is assigned to your manager account yet. Ask an admin to assign you as the lead of a team." : "No leave requests in this view."}</div>}</div>}
    </section>
    {decision && <div onMouseDown={(event) => { if (event.target === event.currentTarget) setDecision(null); }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 20, background: "rgba(3, 7, 18, .72)", backdropFilter: "blur(8px)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="leave-decision-title" className="panel panel-pad" style={{ width: "min(100%, 520px)", borderColor: decision.action === "REJECTED" ? "rgba(248,113,113,.35)" : "rgba(98,230,213,.35)", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", color: decision.action === "REJECTED" ? "#fca5a5" : "#6ee7b7", background: decision.action === "REJECTED" ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.12)" }}>
              {decision.action === "REJECTED" ? <ShieldAlert size={20} /> : <Check size={20} />}
            </div>
            <div><div className="eyebrow">LEAVE DECISION</div><h2 id="leave-decision-title" className="section-title" style={{ marginTop: 5, fontSize: 18 }}>{decision.action === "APPROVED" ? "Approve this request?" : "Reject this request?"}</h2></div>
          </div>
          <button className="icon-button" type="button" aria-label="Close decision dialog" onClick={() => setDecision(null)}><X size={17} /></button>
        </div>
        <div className="notice" style={{ marginBottom: 16 }}>
          <strong>{decision.row.employee.firstName} {decision.row.employee.lastName}</strong> · {decision.row.leaveType.name}<br />
          {dateLabel(decision.row.startDate)}{decision.row.startDate.slice(0, 10) !== decision.row.endDate.slice(0, 10) ? ` – ${dateLabel(decision.row.endDate)}` : ""}
          {decision.row.partialStartTime && decision.row.partialEndTime ? ` · ${decision.row.partialStartTime}–${decision.row.partialEndTime}` : ""}
          {" · "}{Number(decision.row.units)} {Number(decision.row.units) === 1 ? "day" : "days"}
        </div>
        <label className="form-field"><span className="form-label">{decision.action === "REJECTED" ? "Reason for rejection (required)" : "Approval note (optional)"}</span><textarea className="field" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} value={decisionComment} onChange={(event) => { setDecisionComment(event.target.value); setDecisionError(""); }} maxLength={10000} rows={4} placeholder={decision.action === "REJECTED" ? "Explain why this leave request is being rejected…" : "Add a note for the employee, if needed…"} required={decision.action === "REJECTED"} autoFocus /><span className="section-note">{countWords(decisionComment)} / 500 words</span></label>
        {decisionError && <div className="notice" role="alert" style={{ marginTop: 12, borderColor: "rgba(248,113,113,.35)", color: "#fca5a5" }}>{decisionError}</div>}
        <div className="form-actions"><button type="button" className="button-secondary" disabled={savingDecision} onClick={() => setDecision(null)}>Cancel</button><button type="button" className={decision.action === "REJECTED" ? "button-secondary" : "button-primary"} disabled={savingDecision} onClick={() => void decide()}>{savingDecision ? "Saving…" : decision.action === "REJECTED" ? <><X size={15} /> Reject request</> : <><Check size={15} /> Approve request</>}</button></div>
      </section>
    </div>}
    <p className="footer-note">Leave visibility and decisions are enforced by server-side authorization. Hiding a menu item is not used as a security boundary.</p>
  </Page>;
}
