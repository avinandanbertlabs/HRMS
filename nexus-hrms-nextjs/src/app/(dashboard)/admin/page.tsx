import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isCompanyAdmin } from "@/lib/permissions/access";
import PageClient from "./page-client";
import { AdminAccessNotice } from "@/components/admin/admin-access-notice";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  if (!isCompanyAdmin(session.user.roles)) return <AdminAccessNotice />;
  return <PageClient />;
}
