"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to change password.");
      await signOut({ callbackUrl: "/login?passwordChanged=1" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change password.");
      setSaving(false);
    }
  }

  return <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
    <label className="form-field"><span className="form-label">Current temporary password</span><input className="field" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
    <label className="form-field"><span className="form-label">New password (12–128 characters)</span><input className="field" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
    <label className="form-field"><span className="form-label">Confirm new password</span><input className="field" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
    {error && <div className="notice" role="alert">{error}</div>}
    <button className="button-primary" disabled={saving}>{saving ? "Updating…" : "Change password"}</button>
  </form>;
}
