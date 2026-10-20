import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  return <AppShell roles={session.user.roles ?? []} userName={session.user.name ?? session.user.email ?? "User"}>{children}</AppShell>;
}
