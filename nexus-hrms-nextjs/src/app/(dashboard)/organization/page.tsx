import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isCompanyAdmin } from "@/lib/permissions/access";
import PageClient from "./page-client";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isCompanyAdmin(session.user.roles)) redirect("/leave");
  return <PageClient />;
}
