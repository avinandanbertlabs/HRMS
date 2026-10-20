import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { employeeSchema } from "@/lib/validation/schemas";

const createEmployeeSchema = employeeSchema.extend({
  accountMode: z.enum(["CREATE", "LINK_EXISTING"]).default("CREATE"),
  initialPassword: z.string().min(12).max(128).optional(),
  accountRole: z.enum(["EMPLOYEE", "MANAGER"]).default("EMPLOYEE"),
}).superRefine((value, context) => {
  if (value.accountMode === "CREATE" && !value.initialPassword) {
    context.addIssue({ code: "custom", path: ["initialPassword"], message: "An initial password is required for a new login account." });
  }
});

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 25), 1), 100);
  let employeeIds: string[];
  if (actor.level === "ADMIN") {
    const employees = await prisma.employee.findMany({ where: { companyId: actor.companyId }, select: { id: true } });
    employeeIds = employees.map((employee) => employee.id);
  } else if (actor.level === "MANAGER" && actor.teamIds.length) {
    const employees = await prisma.employee.findMany({ where: { companyId: actor.companyId, teamId: { in: actor.teamIds } }, select: { id: true } });
    employeeIds = [...new Set([...employees.map((employee) => employee.id), ...(actor.employee ? [actor.employee.id] : [])])];
  } else if (actor.level === "MANAGER" && actor.employee) {
    employeeIds = [actor.employee.id];
  } else employeeIds = actor.employee ? [actor.employee.id] : [];

  const data = employeeIds.length ? await prisma.employee.findMany({
    where: {
      companyId: actor.companyId, id: { in: employeeIds },
      ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }, { employeeCode: { contains: q, mode: "insensitive" as const } }] } : {}),
    }, take: limit, orderBy: { lastName: "asc" },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, email: true, status: true, team: { select: { id: true, name: true } }, department: { select: { name: true } }, designation: { select: { title: true } } },
  }) : [];
  const leaveTotals = data.length ? await prisma.leaveRequest.groupBy({
    by: ["employeeId"],
    where: { employeeId: { in: data.map((employee) => employee.id) }, status: "APPROVED" },
    _sum: { units: true },
  }) : [];
  const totalByEmployeeId = new Map(leaveTotals.map((entry) => [entry.employeeId, Number(entry._sum.units ?? 0)]));
  return NextResponse.json({ data: data.map((employee) => ({ ...employee, totalLeaveTaken: totalByEmployeeId.get(employee.id) ?? 0 })), limit, scope: actor.level });
}

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company admins can create employee records." }, { status: 403 });
  const parsed = createEmployeeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const { initialPassword, accountRole, accountMode, ...employeeData } = parsed.data;
  if (!employeeData.teamId) return NextResponse.json({ error: "Assign the employee to a team so leave requests can be routed correctly." }, { status: 400 });
  const team = await prisma.team.findFirst({ where: { id: employeeData.teamId, companyId: actor.companyId }, select: { id: true } });
  if (!team) return NextResponse.json({ error: "Selected team does not belong to this company." }, { status: 400 });
  if (employeeData.departmentId) {
    const department = await prisma.department.findFirst({ where: { id: employeeData.departmentId, companyId: actor.companyId }, select: { id: true } });
    if (!department) return NextResponse.json({ error: "Selected department does not belong to this company." }, { status: 400 });
  }
  if (employeeData.designationId) {
    const designation = await prisma.designation.findFirst({ where: { id: employeeData.designationId, companyId: actor.companyId }, select: { id: true } });
    if (!designation) return NextResponse.json({ error: "Selected designation does not belong to this company." }, { status: 400 });
  }
  const existingUser = await prisma.user.findUnique({
    where: { email: employeeData.email.toLowerCase() },
    select: { id: true, companyId: true, isActive: true, employee: { select: { id: true } } },
  });
  if (accountMode === "CREATE" && existingUser) {
    return NextResponse.json({ error: "A login account already exists for this email." }, { status: 409 });
  }
  if (accountMode === "LINK_EXISTING" && !existingUser) {
    return NextResponse.json({ error: "No existing login account matches this email." }, { status: 404 });
  }
  if (existingUser && existingUser.companyId !== actor.companyId) {
    return NextResponse.json({ error: "The existing login account belongs to a different company." }, { status: 409 });
  }
  if (existingUser && !existingUser.isActive) {
    return NextResponse.json({ error: "The existing login account is inactive." }, { status: 409 });
  }
  if (accountMode === "LINK_EXISTING" && existingUser?.employee) {
    return NextResponse.json({ error: "This login account is already linked to an employee profile." }, { status: 409 });
  }
  try {
    const employee = await prisma.$transaction(async (tx) => {
      let userId = existingUser?.id;
      if (accountMode === "CREATE") {
        if (!initialPassword) throw new Error("An initial password is required to create a login account.");
        const passwordHash = await bcrypt.hash(initialPassword, 12);
        const user = await tx.user.create({
          data: {
            email: employeeData.email.toLowerCase(),
            name: `${employeeData.firstName} ${employeeData.lastName}`.trim(),
            passwordHash,
            mustChangePassword: true,
            companyId: actor.companyId,
          },
        });
        const role = await tx.role.findUniqueOrThrow({ where: { key: accountRole } });
        await tx.userRole.create({ data: { userId: user.id, roleId: role.id, assignedById: actor.userId } });
        userId = user.id;
      } else if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { name: `${employeeData.firstName} ${employeeData.lastName}`.trim() },
        });
      }
      if (!userId) throw new Error("A matching login account is required.");
      const created = await tx.employee.create({
        data: { ...employeeData, email: employeeData.email.toLowerCase(), companyId: actor.companyId, userId },
      });
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.userId,
          action: "employee.created",
          entityType: "Employee",
          entityId: created.id,
          metadata: {
            teamId: created.teamId,
            accountCreated: accountMode === "CREATE",
            accountLinked: accountMode === "LINK_EXISTING",
            ...(accountMode === "CREATE" ? { accountRole } : {}),
          },
        },
      });
      return created;
    });
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Employee code or login email already exists." }, { status: 409 });
    }
    console.error("Failed to create employee record.", error);
    return NextResponse.json({ error: "Unable to create the employee right now." }, { status: 500 });
  }
}
