import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export type AccessLevel = "ADMIN" | "MANAGER" | "EMPLOYEE";

export async function getActor() {
  const session = await auth();
  if (!session?.user?.id || !session.user.companyId) return null;
  if (session.user.mustChangePassword) return null;

  const roles = session.user.roles ?? [];
  const isAdmin = roles.some((role: string) => role === "SUPER_ADMIN" || role === "HR_ADMIN");
  const isManager = roles.includes("MANAGER");
  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id, companyId: session.user.companyId },
    include: { team: { select: { id: true, name: true } } },
  });

  let teams: { id: string; name: string }[] = [];
  if (isManager && employee) {
    teams = await prisma.team.findMany({
      where: { companyId: session.user.companyId, leadEmployeeId: employee.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  const teamIds = teams.map((team) => team.id);

  const level: AccessLevel = isAdmin ? "ADMIN" : isManager ? "MANAGER" : "EMPLOYEE";
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    name: session.user.name ?? "User",
    roles,
    level,
    employee,
    teams,
    teamIds,
  };
}

export function isCompanyAdmin(roles: string[] | undefined) {
  return Boolean(roles?.some((role) => role === "SUPER_ADMIN" || role === "HR_ADMIN"));
}
