import { NextResponse } from "next/server";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company admins can manage accounts." }, { status: 403 });

  const [employees, unlinkedUsers, teams] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: actor.companyId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        team: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
        reportsTo: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        ledTeams: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, isActive: true, mustChangePassword: true, roles: { select: { role: { select: { key: true } } } } } },
      },
    }),
    prisma.user.findMany({
      where: { companyId: actor.companyId, employee: { is: null } },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true, isActive: true, mustChangePassword: true, roles: { select: { role: { select: { key: true } } } } },
    }),
    prisma.team.findMany({ where: { companyId: actor.companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const hierarchyOptions = employees.map((employee) => ({
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    teamId: employee.teamId,
  }));
  return NextResponse.json({
    employees: employees.map((employee) => ({
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      status: employee.status,
      teamId: employee.teamId,
      team: employee.team,
      department: employee.department,
      designation: employee.designation,
      reportsTo: employee.reportsTo,
      ledTeams: employee.ledTeams,
      account: employee.user ? {
        id: employee.user.id,
        email: employee.user.email,
        isActive: employee.user.isActive,
        mustChangePassword: employee.user.mustChangePassword,
        roles: employee.user.roles.map(({ role }) => role.key),
      } : null,
    })),
    unlinkedUsers: unlinkedUsers.map((user) => ({
      ...user,
      roles: user.roles.map(({ role }) => role.key),
    })),
    hierarchyOptions,
    teams,
  });
}
