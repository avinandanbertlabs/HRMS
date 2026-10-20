import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActor } from "@/lib/permissions/access";
import { managerLeaveEmployeeIds } from "@/lib/permissions/scope";
import { leaveRequestSchema } from "@/lib/validation/schemas";
import { countWorkingDays, indiaCalendarDate, leaveBackdateError, partialLeaveUnits } from "@/lib/leave/working-days";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let employeeIds: string[] = [];
  if (actor.level === "ADMIN") {
    const employees = await prisma.employee.findMany({
      where: { companyId: actor.companyId },
      select: { id: true },
    });
    employeeIds = employees.map((employee) => employee.id);
  } else if (actor.level === "MANAGER") {
    const employees = actor.teamIds.length
      ? await prisma.employee.findMany({
        where: { companyId: actor.companyId, teamId: { in: actor.teamIds } },
        select: { id: true },
      })
      : [];
    employeeIds = managerLeaveEmployeeIds(actor.employee?.id, employees.map((employee) => employee.id));
  } else if (actor.employee) {
    employeeIds = [actor.employee.id];
  }

  const [data, leaveTypes, balances, holidayRows] = await Promise.all([
    employeeIds.length
      ? prisma.leaveRequest.findMany({
          where: { employeeId: { in: employeeIds } },
          include: {
            leaveType: { select: { id: true, name: true, code: true, paid: true } },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
    prisma.leaveType.findMany({
      where: { companyId: actor.companyId, active: true },
      select: { id: true, name: true, code: true, paid: true },
      orderBy: { name: "asc" },
    }),
    actor.employee
      ? prisma.leaveBalance.findMany({
          where: { employeeId: actor.employee.id, year: new Date().getFullYear() },
          include: { leaveType: { select: { name: true, code: true } } },
        })
      : Promise.resolve([]),
    prisma.holiday.findMany({
      where: { calendar: { companyId: actor.companyId } },
      select: { date: true },
    }),
  ]);

  return NextResponse.json({
    data,
    leaveTypes,
    balances,
    holidays: [...new Set(holidayRows.map((holiday) => holiday.date.toISOString().slice(0, 10)))],
    access: {
      applicantName: actor.employee ? `${actor.employee.firstName} ${actor.employee.lastName}`.trim() : actor.name,
      applicantEmployeeId: actor.employee?.id ?? null,
      isTeamLead: Boolean(actor.employee?.teamId && actor.teamIds.includes(actor.employee.teamId)),
      level: actor.level,
      canApply: Boolean(actor.employee),
      canApprove: actor.level === "ADMIN" || (actor.level === "MANAGER" && actor.teamIds.length > 0),
      teamName: actor.teams.map((team) => team.name).join(", ") || actor.employee?.team?.name || null,
      scopeLabel:
        actor.level === "ADMIN"
          ? "All teams · company-wide access"
          : actor.level === "MANAGER"
            ? `Your own requests${actor.teams.length ? ` and assigned team(s): ${actor.teams.map((team) => team.name).join(", ")}` : ""}`
            : "Only your own leave requests",
    },
  });
}

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.employee) {
    return NextResponse.json({ error: "Your account is not linked to an employee profile." }, { status: 403 });
  }

  const parsed = leaveRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 });
  }
  const type = await prisma.leaveType.findFirst({
    where: { id: parsed.data.leaveTypeId, companyId: actor.companyId, active: true },
    select: { id: true, code: true },
  });
  if (!type) return NextResponse.json({ error: "Leave type not found." }, { status: 400 });

  const todayInIndia = indiaCalendarDate();
  const requestedStart = parsed.data.startDate.toISOString().slice(0, 10);
  const backdateError = leaveBackdateError(type.code, requestedStart, todayInIndia);
  if (backdateError) return NextResponse.json({ error: backdateError }, { status: 400 });
  const holidayRows = await prisma.holiday.findMany({
    where: {
      calendar: { companyId: actor.companyId },
      date: { gte: parsed.data.startDate, lte: parsed.data.endDate },
    },
    select: { date: true },
  });
  const holidayDates = new Set(holidayRows.map((holiday) => holiday.date.toISOString().slice(0, 10)));
  const partial = parsed.data.partialStartTime && parsed.data.partialEndTime
    ? partialLeaveUnits(parsed.data.partialStartTime, parsed.data.partialEndTime)
    : null;
  if (partial && "error" in partial) return NextResponse.json({ error: partial.error }, { status: 400 });
  const fullDayUnits = countWorkingDays(parsed.data.startDate, parsed.data.endDate, holidayDates);
  if (fullDayUnits < 1) return NextResponse.json({ error: "The selected dates contain no working days." }, { status: 400 });
  const units = partial && "units" in partial ? partial.units : fullDayUnits;
  if (units > 365) return NextResponse.json({ error: "A leave request cannot exceed 365 working days." }, { status: 400 });

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: actor.employee.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: parsed.data.endDate },
      endDate: { gte: parsed.data.startDate },
    },
    select: { id: true },
  });
  if (overlap) return NextResponse.json({ error: "An existing leave request overlaps these dates." }, { status: 409 });

  if (!actor.employee.teamId) {
    return NextResponse.json({ error: "Your employee profile has no team assigned. Contact an admin before applying for leave." }, { status: 409 });
  }
  const team = await prisma.team.findFirst({
    where: { id: actor.employee.teamId, companyId: actor.companyId },
    include: { leadEmployee: { select: { userId: true } } },
  });
  let approverUserId = team?.leadEmployee?.userId;
  if (!team || !approverUserId) {
    return NextResponse.json({ error: "Your team does not have an active lead assigned yet. Contact an admin before applying for leave." }, { status: 409 });
  }
  if (approverUserId === actor.userId) {
    const independentReviewer = await prisma.user.findFirst({
      where: {
        companyId: actor.companyId,
        isActive: true,
        id: { not: actor.userId },
        roles: { some: { role: { key: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } } },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!independentReviewer) {
      return NextResponse.json({ error: "Your leave request needs an active company admin to review it. Ask an admin to assign an independent reviewer before submitting." }, { status: 409 });
    }
    approverUserId = independentReviewer.id;
  }

  const data = await prisma.leaveRequest.create({
    data: {
      employeeId: actor.employee.id,
      leaveTypeId: type.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      partialStartTime: parsed.data.partialStartTime ?? null,
      partialEndTime: parsed.data.partialEndTime ?? null,
      units,
      reason: parsed.data.reason,
      status: "PENDING",
      // The approver is derived from the employee's assigned team, never from a client-submitted team name.
      approverId: approverUserId,
    },
    include: {
      leaveType: { select: { id: true, name: true, code: true, paid: true } },
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, team: { select: { id: true, name: true } } } },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: actor.companyId,
      actorId: actor.userId,
      action: "leave.request.created",
      entityType: "LeaveRequest",
      entityId: data.id,
      metadata: {
        employeeId: actor.employee.id,
        teamId: actor.employee.teamId,
        approverAssigned: true,
        partialDay: Boolean(partial),
        ...(partial && "durationMinutes" in partial ? { durationMinutes: partial.durationMinutes } : {}),
      },
    },
  });
  return NextResponse.json({ data }, { status: 201 });
}
