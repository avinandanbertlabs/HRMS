import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { canViewEmployeeRecord, reportingWouldCycle } from "@/lib/permissions/scope";
import { employeeProfileSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

async function getScopedEmployee(id: string, actor: NonNullable<Awaited<ReturnType<typeof getActor>>>) {
  const employee = await prisma.employee.findFirst({
    where: { id, companyId: actor.companyId },
    include: {
      team: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, title: true } },
      reportsTo: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
    },
  });
  if (!employee) return null;
  const teamEmployees = actor.level === "MANAGER" && actor.teamIds.length
    ? await prisma.employee.findMany({
        where: { companyId: actor.companyId, teamId: { in: actor.teamIds } },
        select: { id: true },
      })
    : [];
  const canView = canViewEmployeeRecord({
    isAdmin: isCompanyAdmin(actor.roles),
    isManager: actor.level === "MANAGER",
    requestedEmployeeId: employee.id,
    ownEmployeeId: actor.employee?.id,
    teamEmployeeIds: [...teamEmployees.map((item) => item.id), ...(actor.employee ? [actor.employee.id] : [])],
  });
  return canView ? employee : null;
}

export async function GET(_req: Request, context: RouteContext) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const requestedId = id === "me" ? actor.employee?.id : id;
  if (!requestedId) return NextResponse.json({ error: "Your account is not linked to an employee profile." }, { status: 404 });
  const employee = await getScopedEmployee(requestedId, actor);
  if (!employee) return NextResponse.json({ error: "Employee profile not found or outside your team scope." }, { status: 404 });

  const [leaveTotal, departments, designations, teams, reportingEmployees] = await Promise.all([
    prisma.leaveRequest.aggregate({
      where: { employeeId: employee.id, status: "APPROVED" },
      _sum: { units: true },
    }),
    prisma.department.findMany({ where: { companyId: actor.companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.designation.findMany({ where: { companyId: actor.companyId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    isCompanyAdmin(actor.roles)
      ? prisma.team.findMany({ where: { companyId: actor.companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isCompanyAdmin(actor.roles)
      ? prisma.employee.findMany({ where: { companyId: actor.companyId, id: { not: employee.id } }, select: { id: true, firstName: true, lastName: true, employeeCode: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
      : actor.level === "MANAGER" && actor.teamIds.length
        ? prisma.employee.findMany({
            where: {
              companyId: actor.companyId,
              id: { not: employee.id },
              OR: [{ teamId: { in: actor.teamIds } }, ...(actor.employee ? [{ id: actor.employee.id }] : [])],
            },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          })
        : employee.teamId
          ? prisma.employee.findMany({
              where: {
                companyId: actor.companyId,
                id: { not: employee.id },
                OR: [{ teamId: employee.teamId }, { ledTeams: { some: { id: employee.teamId } } }],
              },
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
              orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            })
          : Promise.resolve([]),
  ]);

  return NextResponse.json({
    data: { ...employee, totalLeaveTaken: Number(leaveTotal._sum.units ?? 0) },
    options: { departments, designations, teams, reportingEmployees },
    access: {
      isSelf: actor.employee?.id === employee.id,
      canEdit: actor.employee?.id === employee.id || actor.level === "MANAGER" || isCompanyAdmin(actor.roles),
      canEditWorkDetails: actor.employee?.id === employee.id || actor.level === "MANAGER" || isCompanyAdmin(actor.roles),
      canEditTeam: isCompanyAdmin(actor.roles),
    },
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const requestedId = id === "me" ? actor.employee?.id : id;
  if (!requestedId) return NextResponse.json({ error: "Your account is not linked to an employee profile." }, { status: 404 });
  const employee = await getScopedEmployee(requestedId, actor);
  if (!employee) return NextResponse.json({ error: "Employee profile not found or outside your team scope." }, { status: 404 });

  const parsed = employeeProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const values = parsed.data;
  const isSelf = actor.employee?.id === employee.id;
  const canEditWorkDetails = isSelf || actor.level === "MANAGER" || isCompanyAdmin(actor.roles);
  if (!canEditWorkDetails && ["departmentId", "designationId", "reportsToId", "joinedAt"].some((field) => Object.hasOwn(values, field))) {
    return NextResponse.json({ error: "You cannot change work details for this employee." }, { status: 403 });
  }
  if (values.teamId !== undefined && !isCompanyAdmin(actor.roles)) {
    return NextResponse.json({ error: "Only a company admin can change team membership." }, { status: 403 });
  }
  if (!isSelf && !canEditWorkDetails) {
    return NextResponse.json({ error: "You can only edit your own profile." }, { status: 403 });
  }

  if (values.departmentId && !await prisma.department.findFirst({ where: { id: values.departmentId, companyId: actor.companyId }, select: { id: true } })) {
    return NextResponse.json({ error: "Selected department does not belong to this company." }, { status: 400 });
  }
  if (values.designationId && !await prisma.designation.findFirst({ where: { id: values.designationId, companyId: actor.companyId }, select: { id: true } })) {
    return NextResponse.json({ error: "Selected designation does not belong to this company." }, { status: 400 });
  }
  if (values.teamId && !await prisma.team.findFirst({ where: { id: values.teamId, companyId: actor.companyId }, select: { id: true } })) {
    return NextResponse.json({ error: "Selected team does not belong to this company." }, { status: 400 });
  }
  if (values.reportsToId) {
    if (values.reportsToId === employee.id) return NextResponse.json({ error: "An employee cannot report to themselves." }, { status: 400 });
    const manager = await prisma.employee.findFirst({
      where: {
        id: values.reportsToId,
        companyId: actor.companyId,
        ...(actor.level === "MANAGER" && !isCompanyAdmin(actor.roles)
          ? {
              OR: [
                { teamId: { in: actor.teamIds } },
                { ledTeams: { some: { id: { in: actor.teamIds } } } },
              ],
            }
          : isSelf && !isCompanyAdmin(actor.roles)
            ? { OR: [{ teamId: employee.teamId ?? "__no_assigned_team__" }, ...(employee.teamId ? [{ ledTeams: { some: { id: employee.teamId } } }] : [])] }
            : {}),
      },
      select: { id: true },
    });
    if (!manager) return NextResponse.json({ error: "Reporting employee does not belong to this company." }, { status: 400 });
    const reportingLinks = await prisma.employee.findMany({
      where: { companyId: actor.companyId },
      select: { id: true, reportsToId: true },
    });
    const managerByEmployeeId = new Map(reportingLinks.map((record) => [record.id, record.reportsToId]));
    managerByEmployeeId.set(employee.id, values.reportsToId);
    if (reportingWouldCycle(employee.id, values.reportsToId, managerByEmployeeId)) {
      return NextResponse.json({ error: "This reporting assignment would create a circular reporting chain." }, { status: 400 });
    }
  }

  const data = {
    ...(values.firstName !== undefined ? { firstName: values.firstName } : {}),
    ...(values.lastName !== undefined ? { lastName: values.lastName } : {}),
    ...(values.workEmail !== undefined ? { workEmail: values.workEmail || null } : {}),
    ...(values.phone !== undefined ? { phone: values.phone || null } : {}),
    ...(values.dateOfBirth !== undefined ? { dateOfBirth: values.dateOfBirth ? new Date(`${values.dateOfBirth}T00:00:00.000Z`) : null } : {}),
    ...(values.location !== undefined ? { location: values.location || null } : {}),
    ...(values.joinedAt !== undefined ? { joinedAt: values.joinedAt ? new Date(`${values.joinedAt}T00:00:00.000Z`) : null } : {}),
    ...(values.departmentId !== undefined ? { departmentId: values.departmentId } : {}),
    ...(values.designationId !== undefined ? { designationId: values.designationId } : {}),
    ...(values.reportsToId !== undefined ? { reportsToId: values.reportsToId } : {}),
    ...(values.teamId !== undefined && isCompanyAdmin(actor.roles) ? { teamId: values.teamId } : {}),
  };
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.employee.update({
      where: { id: employee.id },
      data,
      include: {
        team: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
        reportsTo: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
    if (employee.userId && (values.firstName !== undefined || values.lastName !== undefined)) {
      await tx.user.update({
        where: { id: employee.userId },
        data: { name: `${result.firstName} ${result.lastName}`.trim() },
      });
    }
    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: "employee.profile.updated",
        entityType: "Employee",
        entityId: employee.id,
        metadata: { fields: Object.keys(data), updatedBySelf: isSelf },
      },
    });
    return result;
  });
  return NextResponse.json({ data: updated });
}
