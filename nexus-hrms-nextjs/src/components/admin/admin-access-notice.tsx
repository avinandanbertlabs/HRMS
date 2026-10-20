"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LockKeyhole } from "lucide-react";

export function AdminAccessNotice() {
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
    <section className="panel panel-pad" style={{ width: "min(100%, 560px)", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, margin: "0 auto 14px", borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(180,35,50,.1)", color: "#b42332" }}><LockKeyhole size={22} /></div>
      <div className="eyebrow">ADMIN ACCESS REQUIRED</div>
      <h1 className="section-title" style={{ fontSize: 22, margin: "8px 0" }}>This account is not an administrator</h1>
      <p className="section-note" style={{ lineHeight: 1.7, marginBottom: 18 }}>
        The signed-in account does not have the Super Admin or HR Admin role needed for this page. Sign out, then sign in with the administrator login ID from your private credentials file. If this is the first sign-in with a temporary password, change it when prompted.
      </p>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
        <button className="button-primary" onClick={() => void signOut({ callbackUrl: "/login" })}>Sign out and switch account</button>
        <Link className="button-secondary" href="/leave">Return to leave</Link>
      </div>
    </section>
  </main>;
}
