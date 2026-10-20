import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions/access";
import ProfileClient from "./profile-client";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ employeeId?: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const { employeeId } = await searchParams;
  return <ProfileClient employeeId={employeeId ?? null} />;
}
