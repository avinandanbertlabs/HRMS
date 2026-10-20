"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Command, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (result?.error) setError("Sign-in failed. Check your credentials or contact your administrator.");
      else if (result?.url) window.location.href = result.url;
    } catch {
      setError("Unable to sign in right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark"><Command size={20} /></div>
          <div>
            <div className="brand-name">Bert Labs</div>
            <div className="brand-sub">People Operations</div>
          </div>
        </div>
        <div style={{ maxWidth: 540 }}>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={14} /> PEOPLE OPERATIONS</div>
          <h1 className="login-title">Welcome to your <span style={{ color: "#ffe0e3" }}>workspace.</span></h1>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#8e9bb4", maxWidth: 420 }}>One secure place for employee services, leave requests, and organization records.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <span className="pill"><LockKeyhole size={12} /> Secure access</span>
            <span className="pill">Company-scoped services</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#ffe0e3" }}>Bert Labs · Employee Services</div>
      </section>
      <section className="login-form-side">
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 390 }}>
          <div className="eyebrow">SIGN IN</div>
          <h2 style={{ fontSize: 28, letterSpacing: "-.04em", margin: "10px 0 8px" }}>Sign in to your workspace</h2>
          <p style={{ fontSize: 12, color: "#8290a8", lineHeight: 1.6, marginBottom: 27 }}>Use the company account provided by your administrator.</p>
          <label className="form-field" style={{ marginBottom: 16 }}>
            <span className="form-label">Work email</span>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" placeholder="you@company.com" />
          </label>
          <label className="form-field">
            <span className="form-label">Password</span>
            <div style={{ position: "relative" }}>
              <input className="field" style={{ paddingRight: 44 }} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter your password" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} style={{ position: "absolute", right: 10, top: 10, border: 0, background: "transparent", color: "#8290a8", padding: 4 }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {error && <div style={{ fontSize: 11, color: "#ff9dba", marginTop: 13 }} role="alert">{error}</div>}
          <button className="button-primary" style={{ width: "100%", marginTop: 22 }} disabled={busy}>{busy ? "Signing in…" : "Continue securely"}</button>
          <div style={{ fontSize: 11, color: "#68758d", marginTop: 25, textAlign: "center" }}>Need access? Contact your company administrator.</div>
        </form>
      </section>
    </main>
  );
}
