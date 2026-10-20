import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isCompanyAdmin } from "@/lib/permissions/access";
import PeopleDirectory from "./people-directory";

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isCompanyAdmin(session.user.roles)) redirect("/employees");
  if (!(session.user.roles ?? []).includes("MANAGER")) redirect("/leave");
  return <PeopleDirectory />;
}
