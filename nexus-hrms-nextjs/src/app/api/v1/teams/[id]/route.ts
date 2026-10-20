import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { z } from "zod";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only admins can assign team leads." }, { status: 403 });
  const { id } = await context.params;
  const parsed = z.object({
    leadEmployeeId: z.string().min(1).nullable().optional(),
    name: z.string().trim().min(2).max(80).optional(),
    departmentId: z.string().min(1).nullable().optional(),
  }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) return NextResponse.json({ error: "Provide a valid team name, department, or lead assignment." }, { status: 400 });
  const { leadEmployeeId, name, departmentId } = parsed.data;

  const team = await prisma.team.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true, leadEmployeeId: true, name: true } });
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  if (name && name !== team.name) {
    const duplicate = await prisma.team.findFirst({ where: { companyId: actor.companyId, name }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
  }
  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId: actor.companyId }, select: { id: true } });
    if (!department) return NextResponse.json({ error: "Selected department does not belong to this company." }, { status: 400 });
  }
  if (leadEmployeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: leadEmployeeId, companyId: actor.companyId, teamId: team.id, status: "ACTIVE", user: { is: { isActive: true } } }, select: { id: true, userId: true } });
    if (!employee?.userId) return NextResponse.json({ error: "Choose a team member with a login account. Assign them to this team first." }, { status: 400 });
    const managerRole = await prisma.role.findUnique({ where: { key: "MANAGER" }, select: { id: true } });
    if (!managerRole) return NextResponse.json({ error: "Manager role is not configured. Run the database seed first." }, { status: 500 });
    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: team.id }, data: { leadEmployeeId, ...(name !== undefined ? { name } : {}), ...(departmentId !== undefined ? { departmentId } : {}) } });
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: employee.userId!, roleId: managerRole.id } },
        update: {}, create: { userId: employee.userId!, roleId: managerRole.id, assignedById: actor.userId },
      });
      if (team.leadEmployeeId && team.leadEmployeeId !== leadEmployeeId) {
        const previous = await tx.employee.findUnique({ where: { id: team.leadEmployeeId }, select: { id: true, userId: true } });
        if (previous?.userId) {
          const stillLeadsTeam = await tx.team.count({ where: { leadEmployeeId: previous.id, id: { not: team.id } } });
          if (!stillLeadsTeam) await tx.userRole.deleteMany({ where: { userId: previous.userId, roleId: managerRole.id } });
        }
      }
      await tx.auditLog.create({ data: { companyId: actor.companyId, actorId: actor.userId, action: "team.updated", entityType: "Team", entityId: team.id, metadata: { previousName: team.name, name, departmentId, leadEmployeeId } } });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: team.id }, data: { ...(leadEmployeeId !== undefined ? { leadEmployeeId: null } : {}), ...(name !== undefined ? { name } : {}), ...(departmentId !== undefined ? { departmentId } : {}) } });
      if (leadEmployeeId === null && team.leadEmployeeId) {
        const previous = await tx.employee.findUnique({ where: { id: team.leadEmployeeId }, select: { id: true, userId: true } });
        const managerRole = await tx.role.findUnique({ where: { key: "MANAGER" }, select: { id: true } });
        if (previous?.userId && managerRole) {
          const stillLeadsTeam = await tx.team.count({ where: { leadEmployeeId: previous.id, id: { not: team.id } } });
          if (!stillLeadsTeam) await tx.userRole.deleteMany({ where: { userId: previous.userId, roleId: managerRole.id } });
        }
      }
      await tx.auditLog.create({ data: { companyId: actor.companyId, actorId: actor.userId, action: "team.updated", entityType: "Team", entityId: team.id, metadata: { previousName: team.name, name, departmentId, leadEmployeeId } } });
    });
  }
  return NextResponse.json({ success: true });
}
