import Link from "next/link";
import { CalendarDays, GitBranch, LogIn, LogOut, Users } from "lucide-react";
import { Page, PageHeading } from "@/components/ui/page";

const steps = [
  {
    icon: GitBranch,
    title: "Set up your organization",
    text: "Review the General team, create your real departments and teams, then assign teams to departments.",
    href: "/organization",
    action: "Open Organization",
  },
  {
    icon: Users,
    title: "Add employee profiles",
    text: "Create a login for a new colleague, or link an active, unlinked account using its exact work email. Use real employee details and an approved employee ID.",
    href: "/employees",
    action: "Open People directory",
  },
  {
    icon: GitBranch,
    title: "Assign team leads",
    text: "In Access & policies, assign each team's actual lead. Their team assignment controls which leave requests they can review.",
    href: "/admin",
    action: "Open Access & policies",
  },
  {
    icon: CalendarDays,
    title: "Use leave management",
    text: "Employees submit leave requests from their linked profile. Working days exclude weekends and configured company holidays. Sick leave may be backdated by up to seven calendar days. Requests are routed to their team's lead; leads can reject pending requests or revoke an approval with a rejection reason.",
    href: "/leave",
    action: "Open Leave",
  },
  {
    icon: Users,
    title: "Review employee profiles",
    text: "Employees can update profile and work details while login email, employee number, password, employment status, and team assignment stay protected. Team leads can search their assigned teams, view employee details and approved leave totals, and edit work details.",
    href: "/profile",
    action: "Open My Profile",
  },
];

export default function UserGuide() {
  return <Page>
    <PageHeading eyebrow="Bert Labs · Help" title="How to use this workspace" subtitle="A quick guide for signing in, setting up company records, and using employee services." />

    <section className="panel panel-pad guide-session">
      <div className="guide-session-icon"><LogIn size={18} /></div>
      <div>
        <h2 className="section-title">Sign in once; keep working securely</h2>
        <p className="page-subtitle">Your sign-in session is shared across protected pages, so normal navigation does not ask you to enter your password again. When no valid session exists, protected pages return you to sign-in. Use <strong>Sign out</strong> in the left navigation when you finish on a shared device. Sessions expire automatically.</p>
        <div className="guide-session-note"><LogOut size={14} /> Closing a tab does not sign you out. Choose Sign out to end your session now.</div>
      </div>
    </section>

    <div className="guide-steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return <article className="panel panel-pad guide-step" key={step.title}>
          <div className="guide-step-index">{index + 1}</div>
          <div className="guide-step-icon"><Icon size={17} /></div>
          <h2 className="section-title">{step.title}</h2>
          <p className="page-subtitle">{step.text}</p>
          <Link className="guide-step-link" href={step.href}>{step.action} <span aria-hidden="true">→</span></Link>
        </article>;
      })}
    </div>

    <section className="notice guide-data-note">
      Records shown here are stored in the PostgreSQL database configured for this application. Connecting to other company HR systems requires authorized integration access and source data; this workspace does not import those systems automatically.
    </section>
  </Page>;
}
