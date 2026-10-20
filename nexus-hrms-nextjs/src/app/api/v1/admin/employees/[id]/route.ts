import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isCompanyAdmin(actor.roles)) return NextResponse.json({ error: "Only company administrators can delete employee profiles." }, { status: 403 });
  const { id } = await context.params;

  const employee = await prisma.employee.findFirst({
    where: { id, companyId: actor.companyId },
    select: {
      id: true,
      employeeCode: true,
      userId: true,
      user: {
        select: {
          id: true,
          isActive: true,
          roles: { select: { role: { select: { key: true } } } },
          _count: { select: { accounts: true, auditLogs: true } },
        },
      },
      _count: {
        select: {
          directReports: true,
          ledTeams: true,
          reportingAsEmployee: true,
          reportingAsManager: true,
          leaveRequests: true,
          leaveBalances: true,
          attendanceRecords: true,
          punches: true,
          regularizations: true,
          shiftAssignments: true,
        },
      },
    },
  });
  if (!employee) return NextResponse.json({ error: "Employee profile not found." }, { status: 404 });
  if (employee.userId === actor.userId) return NextResponse.json({ error: "You cannot delete your own profile or login." }, { status: 409 });

  const dependencyCounts = Object.values(employee._count);
  if (dependencyCounts.some((count) => count > 0)) {
    return NextResponse.json({
      error: "This employee has leave, reporting, team-lead, attendance, or other linked history. Deactivate the account instead to preserve records.",
    }, { status: 409 });
  }

  const user = employee.user;
  if (user) {
    if (user._count.accounts > 0 || user._count.auditLogs > 0) {
      return NextResponse.json({ error: "This login has identity-provider or audit history. Deactivate it instead to preserve records." }, { status: 409 });
    }
    const hasAdminRole = user.roles.some(({ role }) => role.key === "SUPER_ADMIN" || role.key === "HR_ADMIN");
    if (hasAdminRole && user.isActive) {
      const activeAdminCount = await prisma.user.count({
        where: {
          companyId: actor.companyId,
          isActive: true,
          roles: { some: { role: { key: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } } },
        },
      });
      if (activeAdminCount <= 1) return NextResponse.json({ error: "The last active company administrator cannot be deleted." }, { status: 409 });
    }
    const [approvedRequests, approvalSteps] = await Promise.all([
      prisma.leaveRequest.count({ where: { approverId: user.id } }),
      prisma.leaveApproval.count({ where: { approverId: user.id } }),
    ]);
    if (approvedRequests || approvalSteps) {
      return NextResponse.json({ error: "This login is recorded as a leave approver. Deactivate it instead to preserve approval history." }, { status: 409 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({ where: { id: employee.id } });
      if (user) await tx.user.delete({ where: { id: user.id } });
      await tx.auditLog.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.userId,
          action: "employee.profile_and_login.deleted",
          entityType: "Employee",
          entityId: employee.id,
          metadata: { employeeCode: employee.employeeCode, loginDeleted: Boolean(user) },
        },
      });
    });
    return NextResponse.json({ data: { id: employee.id, deleted: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2025")) {
      return NextResponse.json({ error: "This profile still has dependent records. Deactivate the account instead to preserve them." }, { status: 409 });
    }
    console.error("Failed to delete employee profile.", error);
    return NextResponse.json({ error: "Unable to delete this employee profile right now." }, { status: 500 });
  }
}
