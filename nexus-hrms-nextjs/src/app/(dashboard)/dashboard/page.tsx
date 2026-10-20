import Link from "next/link";
import { Activity, CalendarDays, Clock3, Users } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";
import { MetricCard } from "@/components/ui/metric-card";
import { getActor } from "@/lib/permissions/access";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { BookOpen, Building2, UserPlus } from "lucide-react";

export default async function Dashboard() {
  const actor = await getActor();
  if (!actor) redirect("/login");

  let employeeIds: string[] = [];
  if (actor.level === "ADMIN") {
    const employees = await prisma.employee.findMany({ where: { companyId: actor.companyId }, select: { id: true } });
    employeeIds = employees.map((employee) => employee.id);
  } else if (actor.level === "MANAGER" && actor.teamIds.length) {
    const employees = await prisma.employee.findMany({ where: { companyId: actor.companyId, teamId: { in: actor.teamIds } }, select: { id: true } });
    employeeIds = employees.map((employee) => employee.id);
  } else if (actor.employee) employeeIds = [actor.employee.id];

  const [peopleCount, pendingLeaveRows, approvedLeaves] = await Promise.all([
    actor.level === "EMPLOYEE" ? Promise.resolve(actor.employee ? 1 : 0) : prisma.employee.count({ where: { companyId: actor.companyId, id: { in: employeeIds } } }),
    employeeIds.length ? prisma.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: "PENDING" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, team: { select: { name: true } } } },
        leaveType: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }) : Promise.resolve([]),
    employeeIds.length ? prisma.leaveRequest.count({ where: { employeeId: { in: employeeIds }, status: "APPROVED" } }) : Promise.resolve(0),
  ]);
  const reviewablePendingLeaveRows = actor.level === "MANAGER"
    ? pendingLeaveRows.filter((request) => request.employee.id !== actor.employee?.id)
    : pendingLeaveRows;
  const pendingLeaves = reviewablePendingLeaveRows.length;
  const isAdmin = actor.level === "ADMIN";
  const isManager = actor.level === "MANAGER";
  const title = isAdmin ? "Company overview" : isManager ? "Your team's overview" : "Your workspace";
  const subtitle = isAdmin
    ? "Company-wide people operations and leave activity."
    : isManager
      ? `Leave activity for your assigned team${actor.employee?.team?.name ? ` · ${actor.employee.team.name}` : ""}. No other teams are included.`
      : "Manage your own leave requests and check their status.";

  return <Page>
    <PageHeading eyebrow="Bert Labs · People Operations" title={title} subtitle={subtitle} action={<Link className="button-primary" href="/leave"><CalendarDays size={16} /> {isManager ? "Review team leave" : isAdmin ? "Manage leave" : "Request leave"}</Link>} />
    {isAdmin && peopleCount === 0 && <section className="panel panel-pad setup-guide">
      <div className="setup-guide-heading"><div><div className="eyebrow">GETTING STARTED</div><h2 className="section-title">Set up your people workspace</h2><p className="section-note">Start with your real organization and employee details. The workspace is ready for company records when you add them.</p></div><BookOpen size={21} color="var(--cyan)" /></div>
      <ol className="setup-guide-steps">
        <li><span>1</span><div><strong>Organize your teams</strong><p>Review the General team, then add departments and teams under Organization.</p></div></li>
        <li><span>2</span><div><strong>Add employee profiles</strong><p>Create a login for a new employee, or link a verified existing company account.</p></div></li>
        <li><span>3</span><div><strong>Assign team leads</strong><p>Use Access &amp; policies to assign real team leads and route leave approvals.</p></div></li>
        <li><span>4</span><div><strong>Use employee services</strong><p>Employees sign in once, request leave, and keep their profiles up to date.</p></div></li>
      </ol>
      <div className="setup-guide-actions"><Link className="button-secondary" href="/organization"><Building2 size={15} /> Set up organization</Link><Link className="button-primary" href="/employees"><UserPlus size={15} /> Add employees</Link><Link className="guide-link" href="/guide">Read the user guide</Link></div>
    </section>}
    <div className="stat-grid">
      <MetricCard label={isAdmin ? "Company employees" : isManager ? "People in your team" : "Your employee profile"} value={String(peopleCount).padStart(2, "0")} foot="Scoped|to your access" icon={Users} glow="#b42332" />
      <MetricCard label={isAdmin || isManager ? "Pending leave requests" : "My pending requests"} value={String(pendingLeaves).padStart(2, "0")} foot="Needs|review" icon={Clock3} glow="#b7791f" />
      <MetricCard label={isAdmin || isManager ? "Approved leave requests" : "My approved requests"} value={String(approvedLeaves).padStart(2, "0")} foot="Current|records" icon={CalendarDays} glow="#15803d" />
      <MetricCard label="Access level" value={actor.level === "ADMIN" ? "Admin" : actor.level === "MANAGER" ? "Lead" : "Self"} foot={actor.level === "ADMIN" ? "Company-wide|scope" : actor.level === "MANAGER" ? "Assigned team|scope" : "Personal|scope"} icon={Activity} glow="#b42332" />
    </div>
    {(isManager || isAdmin) && <section className="panel panel-pad" style={{ marginTop: 18 }}>
      <div className="panel-head"><div><div className="section-title">Pending leave notifications <span className="pill amber">{pendingLeaves}</span></div><div className="section-note">All pending requests in your authorized review scope.</div></div><Clock3 size={18} color="var(--cyan)" /></div>
      {reviewablePendingLeaveRows.length ? <div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Team</th><th>Leave type</th><th>Dates / time</th><th>Working days</th><th>Submitted</th></tr></thead><tbody>{reviewablePendingLeaveRows.map((request) => <tr key={request.id}><td><Link href={`/profile?employeeId=${request.employee.id}`} className="person-name">{request.employee.firstName} {request.employee.lastName}</Link><div className="person-sub">{request.employee.employeeCode}</div></td><td>{request.employee.team?.name ?? "Unassigned"}</td><td>{request.leaveType.name}</td><td>{request.startDate.toISOString().slice(0, 10)} – {request.endDate.toISOString().slice(0, 10)}{request.partialStartTime && request.partialEndTime && <div className="person-sub">{request.partialStartTime}–{request.partialEndTime}</div>}</td><td>{Number(request.units)}</td><td>{request.createdAt.toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div> : <div className="empty-state">There are no pending leave requests in your review scope.</div>}
      <div className="form-actions"><Link className="button-primary" href="/leave"><CalendarDays size={15} /> Open leave approvals</Link></div>
    </section>}
    <section className="panel panel-pad" style={{ marginTop: 18 }}>
      <div className="section-title">What you can access</div>
      <div className="section-note" style={{ marginBottom: 16 }}>Permissions are checked on the server for every protected page and API request.</div>
      <div className="three-col">
        <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 10 }}><div className="section-title">{isAdmin ? "Company-wide HR" : isManager ? "Assigned team only" : "Personal leave"}</div><p className="page-subtitle" style={{ marginTop: 8 }}>{isAdmin ? "View company employee records and all team leave requests." : isManager ? "See leave requests only for teams where you are the configured lead." : "Submit requests and track only your own applications and decisions."}</p></div>
        <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 10 }}><div className="section-title">Leave workflow</div><p className="page-subtitle" style={{ marginTop: 8 }}>{isAdmin || isManager ? "Review pending requests within your authorized scope, and record a decision." : "Your team and approver are derived from your assigned employee profile."}</p></div>
        <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 10 }}><div className="section-title">Protected by role</div><p className="page-subtitle" style={{ marginTop: 8 }}>Employee directory, organization settings, and access policies are restricted to admins.</p></div>
      </div>
    </section>
    <p className="footer-note">Counts are calculated from current records within your authorized scope.</p>
  </Page>;
}
