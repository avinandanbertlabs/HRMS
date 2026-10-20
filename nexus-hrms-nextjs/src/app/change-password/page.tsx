import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/dashboard");
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f7f8fa" }}>
    <section className="panel panel-pad" style={{ width: "min(100%, 480px)" }}>
      <div className="eyebrow">ACCOUNT SECURITY</div>
      <h1 className="section-title" style={{ marginTop: 8, fontSize: 24 }}>Set your permanent password</h1>
      <p className="section-note" style={{ lineHeight: 1.6, margin: "10px 0 20px" }}>Your administrator issued a temporary password. Change it now to continue to your workspace.</p>
      <ChangePasswordForm />
    </section>
  </main>;
}
