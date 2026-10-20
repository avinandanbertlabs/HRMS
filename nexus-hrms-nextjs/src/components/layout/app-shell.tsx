"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Activity, BookOpen, CalendarDays, Command, GitBranch, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, Users, X } from "lucide-react";

const overview = { href: "/dashboard", label: "Overview", icon: LayoutDashboard };
const adminNavigation = [
  { label: "WORKSPACE", items: [overview] },
  { label: "PEOPLE OPERATIONS", items: [
    { href: "/employees", label: "People directory", icon: Users },
    { href: "/organization", label: "Organization", icon: GitBranch },
    { href: "/leave", label: "Leave management", icon: CalendarDays },
  ] },
  { label: "SYSTEM", items: [{ href: "/admin", label: "Access & policies", icon: ShieldCheck }] },
];

export function AppShell({ children, roles, userName }: { children: React.ReactNode; roles: string[]; userName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = roles.some((role) => role === "SUPER_ADMIN" || role === "HR_ADMIN");
  const isManager = roles.includes("MANAGER");
  const nav = isAdmin ? adminNavigation : isManager
    ? [
        { label: "WORKSPACE", items: [overview] },
        { label: "MY TEAM", items: [{ href: "/profile", label: "My profile", icon: UserRound }, { href: "/people", label: "Team directory", icon: Users }, { href: "/leave", label: "Team leave approvals", icon: CalendarDays }] },
      ]
    : [
        { label: "WORKSPACE", items: [overview] },
        { label: "SELF SERVICE", items: [{ href: "/profile", label: "My profile", icon: UserRound }, { href: "/leave", label: "My leave", icon: CalendarDays }] },
      ];
  const activeTitle = nav.flatMap((group) => group.items).find((item) => path === item.href)?.label ?? (path === "/guide" ? "How to use this workspace" : "Overview");
  const initials = userName.split(/[ .@_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
  const roleLabel = isAdmin ? "Workspace admin" : isManager ? "Team lead" : "Employee self-service";

  return <div className="app-shell">
    <div className={`mobile-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Command size={20} /></div>
        <div><div className="brand-name">Bert Labs</div><div className="brand-sub">People Operations</div></div>
        <button className="icon-button mobile-menu close-menu" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)} aria-label="Close navigation"><X size={17} /></button>
      </div>
      {nav.map((group) => <div key={group.label}>
        <div className="nav-label">{group.label}</div>
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = path === item.href;
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-link ${active ? "active" : ""}`}><Icon size={17} /><span>{item.label}</span></Link>;
        })}
      </div>)}
      <div>
        <div className="nav-label">HELP</div>
        <Link href="/guide" onClick={() => setOpen(false)} className={`nav-link ${path === "/guide" ? "active" : ""}`}><BookOpen size={17} /><span>How to use this workspace</span></Link>
      </div>
      <div className="sidebar-bottom">
        <div className="nav-link access-label" style={{ cursor: "default" }}><ShieldCheck size={16} /><span>Company-scoped access</span></div>
        <div className="account-row">
          <div className="avatar">{initials}</div>
          <div className="account-details">
            <div className="account-name">{userName}</div>
            <div className="account-role">{roleLabel}</div>
          </div>
        </div>
        <button className="sign-out-button" onClick={() => void signOut({ redirectTo: "/login" })}>
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <div className="crumb"><span className="crumb-company">Bert Labs</span><span className="crumb-separator">/</span> <span className="crumb-page">{activeTitle}</span></div>
        </div>
        <div className="top-actions">
          <div className="pill green system-pill" style={{ height: 28 }}><Activity size={12} /> ACCESS CONTROL ACTIVE</div>
          <div className="avatar">{initials}</div>
          <div className="top-user-label">{userName}</div>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
