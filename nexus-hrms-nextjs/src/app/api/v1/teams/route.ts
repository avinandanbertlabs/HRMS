import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only admins can manage team assignments." }, { status: 403 });
  const [company, teams, employees, departments, businessUnitCount, employeeCount] = await Promise.all([
    prisma.company.findUnique({ where: { id: actor.companyId }, select: { name: true } }),
    prisma.team.findMany({
      where: { companyId: actor.companyId }, orderBy: { name: "asc" },
      include: {
        leadEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, userId: true } },
        department: { select: { name: true } },
        _count: { select: { employees: true } },
      },
    }),
    prisma.employee.findMany({
      where: { companyId: actor.companyId, status: "ACTIVE", userId: { not: null }, user: { is: { isActive: true } } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, teamId: true, user: { select: { roles: { select: { role: { select: { key: true } } } } } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({
      where: { companyId: actor.companyId },
      select: { id: true, name: true, businessUnit: { select: { name: true } }, _count: { select: { employees: true } } },
      orderBy: [{ businessUnit: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.businessUnit.count({ where: { companyId: actor.companyId } }),
    prisma.employee.count({ where: { companyId: actor.companyId } }),
  ]);
  return NextResponse.json({
    company: { name: company?.name ?? "Company" },
    employeeCount,
    businessUnitCount,
    teams: teams.map((team) => ({
      id: team.id, name: team.name, departmentId: team.departmentId, department: team.department?.name ?? null,
      leadEmployee: team.leadEmployee, employeeCount: team._count.employees,
    })),
    departments: departments.map((department) => ({
      id: department.id, name: department.name, businessUnit: department.businessUnit?.name ?? null,
      employeeCount: department._count.employees,
    })),
    employees: employees.map((employee) => ({
      id: employee.id, firstName: employee.firstName, lastName: employee.lastName, employeeCode: employee.employeeCode, teamId: employee.teamId,
      roles: employee.user?.roles.map((item) => item.role.key) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company administrators can create teams." }, { status: 403 });

  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    departmentId: z.string().min(1).optional(),
    leadEmployeeId: z.string().min(1).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a team name and a valid department.", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: parsed.data.departmentId, companyId: actor.companyId },
      select: { id: true },
    });
    if (!department) return NextResponse.json({ error: "Selected department does not belong to this company." }, { status: 400 });
  }
  const lead = parsed.data.leadEmployeeId
    ? await prisma.employee.findFirst({
        where: { id: parsed.data.leadEmployeeId, companyId: actor.companyId, status: "ACTIVE", user: { is: { isActive: true } } },
        select: { id: true, userId: true },
      })
    : null;
  if (parsed.data.leadEmployeeId && !lead?.userId) {
    return NextResponse.json({ error: "Choose an employee with an active login account as the team lead." }, { status: 400 });
  }
  const managerRole = lead ? await prisma.role.findUnique({ where: { key: "MANAGER" }, select: { id: true } }) : null;
  if (lead && !managerRole) return NextResponse.json({ error: "Manager role is not configured. Run the database seed first." }, { status: 500 });

  try {
    const team = await prisma.$transaction(async (transaction) => {
      const created = await transaction.team.create({
        data: { name: parsed.data.name, companyId: actor.companyId, departmentId: parsed.data.departmentId, leadEmployeeId: lead?.id },
      });
      if (lead?.userId && managerRole) {
        await transaction.employee.update({ where: { id: lead.id }, data: { teamId: created.id } });
        await transaction.userRole.upsert({
          where: { userId_roleId: { userId: lead.userId, roleId: managerRole.id } },
          update: {},
          create: { userId: lead.userId, roleId: managerRole.id, assignedById: actor.userId },
        });
      }
      await transaction.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.userId,
          action: "team.created",
          entityType: "Team",
          entityId: created.id,
          metadata: { teamName: created.name, departmentId: created.departmentId, leadEmployeeId: lead?.id ?? null },
        },
      });
      return created;
    });
    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
    }

    console.error("Failed to create team.", error);
    return NextResponse.json({ error: "Unable to create the team right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company administrators can delete teams." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Team ID is required." }, { status: 400 });
  const team = await prisma.team.findFirst({
    where: { id: parsed.data.id, companyId: actor.companyId },
    select: { id: true, name: true, leadEmployeeId: true, _count: { select: { employees: true } } },
  });
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  if (team._count.employees > 0) {
    return NextResponse.json({ error: "This team still has employees. Reassign or remove its members before deleting the empty team." }, { status: 409 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.team.delete({ where: { id: team.id } });
    if (team.leadEmployeeId) {
      const formerLead = await tx.employee.findUnique({ where: { id: team.leadEmployeeId }, select: { userId: true } });
      const managerRole = await tx.role.findUnique({ where: { key: "MANAGER" }, select: { id: true } });
      if (formerLead?.userId && managerRole) {
        const stillLeadsTeam = await tx.team.count({ where: { leadEmployeeId: team.leadEmployeeId } });
        if (!stillLeadsTeam) await tx.userRole.deleteMany({ where: { userId: formerLead.userId, roleId: managerRole.id } });
      }
    }
    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: "team.deleted",
        entityType: "Team",
        entityId: team.id,
        metadata: { teamName: team.name },
      },
    });
  });
  return NextResponse.json({ data: { id: team.id, deleted: true } });
}
