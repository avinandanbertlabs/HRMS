import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { prisma } from "@/lib/db/prisma";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset-password"), temporaryPassword: z.string().min(12).max(128) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("deactivate") }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company admins can manage accounts." }, { status: 403 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid account action or temporary password.", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { id, companyId: actor.companyId },
    select: { id: true, isActive: true, roles: { select: { role: { select: { key: true } } } }, employee: { select: { id: true, status: true, _count: { select: { ledTeams: true } } } } },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (parsed.data.action === "deactivate" && user.id === actor.userId) {
    return NextResponse.json({ error: "You cannot deactivate your own signed-in account." }, { status: 409 });
  }
  if (parsed.data.action === "deactivate" && user.employee?._count.ledTeams) {
    return NextResponse.json({ error: "Reassign this employee's team-lead responsibilities before deactivating the account." }, { status: 409 });
  }
  const targetIsAdmin = user.roles.some(({ role }) => role.key === "SUPER_ADMIN" || role.key === "HR_ADMIN");
  if (targetIsAdmin && (parsed.data.action === "deactivate" || parsed.data.action === "activate") && user.isActive !== (parsed.data.action === "activate")) {
    const activeAdminCount = await prisma.user.count({
      where: {
        companyId: actor.companyId,
        isActive: true,
        roles: { some: { role: { key: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } } },
      },
    });
    if (parsed.data.action === "deactivate" && activeAdminCount <= 1) {
      return NextResponse.json({ error: "The last active company administrator cannot be deactivated." }, { status: 409 });
    }
  }

  if (parsed.data.action === "deactivate" || parsed.data.action === "activate") {
    const active = parsed.data.action === "activate";
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { isActive: active },
        select: { id: true, isActive: true },
      });
      if (user.employee) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { status: active ? (user.employee.status === "INACTIVE" ? "ACTIVE" : user.employee.status) : "INACTIVE" },
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.userId,
          action: active ? "account.activated" : "account.deactivated",
          entityType: "User",
          entityId: user.id,
          metadata: { employeeId: user.employee?.id ?? null },
        },
      });
      return updated;
    });
    return NextResponse.json({ data: result });
  }

  const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true },
    }),
    prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: "account.password.reset",
        entityType: "User",
        entityId: user.id,
        metadata: { employeeId: user.employee?.id ?? null, temporaryPasswordIssued: true },
      },
    }),
  ]);
  return NextResponse.json({ data: { id: user.id, mustChangePassword: true } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company admins can manage accounts." }, { status: 403 });
  const { id } = await context.params;
  if (id === actor.userId) return NextResponse.json({ error: "You cannot delete your signed-in account." }, { status: 409 });

  const user = await prisma.user.findFirst({
    where: { id, companyId: actor.companyId },
    select: { id: true, isActive: true, roles: { select: { role: { select: { key: true } } } }, employee: { select: { id: true } }, _count: { select: { auditLogs: true, accounts: true } } },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.roles.some(({ role }) => role.key === "SUPER_ADMIN" || role.key === "HR_ADMIN") && user.isActive) {
    const activeAdminCount = await prisma.user.count({
      where: {
        companyId: actor.companyId,
        isActive: true,
        roles: { some: { role: { key: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } } },
      },
    });
    if (activeAdminCount <= 1) return NextResponse.json({ error: "The last active company administrator cannot be deleted." }, { status: 409 });
  }
  if (user.employee || user._count.auditLogs > 0 || user._count.accounts > 0) {
    return NextResponse.json({ error: "This account is linked to an employee profile, identity provider, or audit history. Deactivate it instead to preserve records." }, { status: 409 });
  }
  try {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: "account.deleted",
        entityType: "User",
        entityId: user.id,
        metadata: { safeUnlinkedAccountDeletion: true },
      },
    });
    return NextResponse.json({ data: { id: user.id, deleted: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "This account still has dependent records. Deactivate it instead." }, { status: 409 });
    }
    throw error;
  }
}
