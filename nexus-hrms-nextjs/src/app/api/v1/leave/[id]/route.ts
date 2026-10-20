import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActor, isCompanyAdmin } from "@/lib/permissions/access";
import { canDecideLeaveForEmployee, canReviewTeamLeave } from "@/lib/permissions/scope";
import { canDecideLeave, decisionStep } from "@/lib/leave/workflow";
import { countWords } from "@/lib/validation/word-count";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.level === "EMPLOYEE") return NextResponse.json({ error: "Only admins or the assigned team lead can decide leave requests." }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json().catch(() => null) as { action?: unknown; comment?: unknown } | null;
  const action = body?.action;
  if (body?.comment !== undefined && body.comment !== null && typeof body.comment !== "string") {
    return NextResponse.json({ error: "Decision note must be text." }, { status: 400 });
  }
  const comment = typeof body?.comment === "string" ? body.comment.trim() : null;
  if (action !== "APPROVED" && action !== "REJECTED") {
    return NextResponse.json({ error: "Action must be APPROVED or REJECTED." }, { status: 400 });
  }
  if ((comment?.length ?? 0) > 10000 || countWords(comment ?? "") > 500) {
    return NextResponse.json({ error: "Decision note must be 500 words or fewer." }, { status: 400 });
  }
  if (action === "REJECTED" && !comment) {
    return NextResponse.json({ error: "Please provide a reason when rejecting a request." }, { status: 400 });
  }

  const request = await prisma.leaveRequest.findFirst({
    where: { id },
    include: { employee: { select: { id: true, companyId: true, teamId: true, firstName: true, lastName: true, email: true } }, leaveType: { select: { name: true } } },
  });
  if (!request || request.employee.companyId !== actor.companyId) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }
  if (!canDecideLeaveForEmployee(actor.employee?.id, request.employee.id)) {
    return NextResponse.json({ error: "You cannot approve or reject your own leave request. An independent reviewer must decide it." }, { status: 403 });
  }
  if (!canDecideLeave(request.status, action)) {
    return NextResponse.json({ error: "Only pending requests can be approved or rejected; an approved request may only be rejected." }, { status: 409 });
  }

  if (!canReviewTeamLeave({
    isAdmin: isCompanyAdmin(actor.roles),
    isManager: actor.level === "MANAGER",
    managerEmployeeId: actor.employee?.id,
    requestTeamId: request.employee.teamId,
    ledTeamIds: actor.teamIds,
  })) {
    return NextResponse.json({ error: "This request is outside your team scope." }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: action, approverId: actor.userId, comments: comment, decidedAt: new Date() },
    });
    await tx.leaveApproval.upsert({
      where: { requestId_step: { requestId: request.id, step: decisionStep(request.status) } },
      update: { approverId: actor.userId, action, comment, actedAt: new Date() },
      create: { requestId: request.id, approverId: actor.userId, action, comment, actedAt: new Date(), step: decisionStep(request.status) },
    });
    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: action === "APPROVED" ? "leave.request.approved" : "leave.request.rejected",
        entityType: "LeaveRequest",
        entityId: request.id,
        metadata: { employeeId: request.employee.id, teamId: request.employee.teamId, comment, previousStatus: request.status },
      },
    });
    return result;
  });
  // Email delivery is best-effort: the saved approval decision must not be rolled back
  // because an external email provider is unavailable. Configure RESEND_API_KEY and
  // EMAIL_FROM to enable delivery; failures are logged for operational follow-up.
  try {
    const { sendLeaveDecisionEmail } = await import("@/lib/notifications/email");
    const emailResult = await sendLeaveDecisionEmail({
      to: request.employee.email,
      applicantName: `${request.employee.firstName} ${request.employee.lastName}`.trim(),
      leaveType: request.leaveType.name,
      startDate: request.startDate.toISOString().slice(0, 10),
      endDate: request.endDate.toISOString().slice(0, 10),
      status: action,
      comment,
    });
    if (!emailResult.sent && emailResult.reason !== "not_configured") {
      console.error("Leave decision email was not sent:", emailResult.reason);
    }
  } catch (error) {
    console.error("Leave decision email failed:", error);
  }
  return NextResponse.json({ data: updated });
}

/**
 * Leave requests are retained for audit purposes. Employees may withdraw a pending
 * request, which changes its status to CANCELLED; approved records cannot be deleted.
 */
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const request = await prisma.leaveRequest.findFirst({
    where: { id },
    include: { employee: { select: { id: true, companyId: true } } },
  });
  if (!request || request.employee.companyId !== actor.companyId) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }
  const isOwner = actor.employee?.id === request.employeeId;
  if (!isOwner && !isCompanyAdmin(actor.roles)) {
    return NextResponse.json({ error: "You can only withdraw your own request." }, { status: 403 });
  }
  if (request.status === "APPROVED") {
    return NextResponse.json({ error: "Approved leave records cannot be deleted. Contact HR if a correction is required." }, { status: 409 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending requests can be withdrawn." }, { status: 409 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    await tx.auditLog.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.userId,
        action: "leave.request.cancelled",
        entityType: "LeaveRequest",
        entityId: id,
        metadata: { employeeId: request.employeeId, previousStatus: request.status },
      },
    });
    return result;
  });
  return NextResponse.json({ data: updated, message: "Leave request withdrawn. The audit record has been retained." });
}
