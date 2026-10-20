import { describe, expect, it } from "vitest";
import { employeeProfileSchema, leaveRequestSchema, employeeSchema } from "../src/lib/validation/schemas";
import { countWorkingDays, dateDaysBefore, leaveBackdateError, partialLeaveUnits } from "../src/lib/leave/working-days";
import { canDecideLeave, decisionStep } from "../src/lib/leave/workflow";

describe("HRMS input validation", () => {
  it("rejects leave where end date precedes start date", () => {
    expect(leaveRequestSchema.safeParse({ leaveTypeId: "annual", startDate: "2026-10-22", endDate: "2026-10-21", units: 1, reason: "Personal leave" }).success).toBe(false);
  });
  it("accepts sick leave payloads without trusting client-provided day counts", () => {
    expect(leaveRequestSchema.safeParse({ leaveTypeId: "sick", startDate: "2026-10-19", endDate: "2026-10-20", reason: "Not feeling well" }).success).toBe(true);
  });
  it("accepts optional partial-day times but requires both times on one date", () => {
    expect(leaveRequestSchema.safeParse({ leaveTypeId: "sick", startDate: "2026-10-19", endDate: "2026-10-19", partialStartTime: "16:00", partialEndTime: "18:00", reason: "Leaving early" }).success).toBe(true);
    expect(leaveRequestSchema.safeParse({ leaveTypeId: "sick", startDate: "2026-10-19", endDate: "2026-10-19", partialStartTime: "16:00", reason: "Leaving early" }).success).toBe(false);
    expect(leaveRequestSchema.safeParse({ leaveTypeId: "sick", startDate: "2026-10-19", endDate: "2026-10-20", partialStartTime: "16:00", partialEndTime: "18:00", reason: "Leaving early" }).success).toBe(false);
  });
  it("limits leave reasons to 500 whitespace-separated words", () => {
    const base = { leaveTypeId: "sick", startDate: "2026-10-19", endDate: "2026-10-19" };
    expect(leaveRequestSchema.safeParse({ ...base, reason: Array(500).fill("word").join(" ") }).success).toBe(true);
    expect(leaveRequestSchema.safeParse({ ...base, reason: Array(501).fill("word").join(" ") }).success).toBe(false);
  });
  it("rejects invalid employee email", () => {
    expect(employeeSchema.safeParse({ employeeCode: "BL-1", firstName: "Sam", lastName: "Das", email: "bad" }).success).toBe(false);
  });
  it("accepts a valid employee payload", () => {
    expect(employeeSchema.safeParse({ employeeCode: "BL-1", firstName: "Sam", lastName: "Das", email: "sam@example.com" }).success).toBe(true);
  });
  it("prevents employee profile edits from changing unlisted identity fields", () => {
    expect(employeeProfileSchema.safeParse({ phone: "1234567890", employeeCode: "BL-2" }).success).toBe(false);
  });
});

describe("working-day leave calculations", () => {
  it("excludes weekend days and company holidays", () => {
    expect(countWorkingDays(new Date("2026-10-16T00:00:00Z"), new Date("2026-10-20T00:00:00Z"), new Set(["2026-10-19"]))).toBe(2);
  });
  it("calculates an inclusive seven-calendar-day sick leave cutoff", () => {
    expect(dateDaysBefore("2026-10-20", 7)).toBe("2026-10-13");
  });
  it("allows sick leave up to seven days back but rejects older and non-sick backdates", () => {
    expect(leaveBackdateError("SICK", "2026-10-13", "2026-10-20")).toBeNull();
    expect(leaveBackdateError("SICK", "2026-10-12", "2026-10-20")).toContain("7 calendar days");
    expect(leaveBackdateError("ANNUAL", "2026-10-19", "2026-10-20")).toContain("Only sick leave");
  });
  it("converts partial-day hours to eight-hour leave units and validates time order", () => {
    expect(partialLeaveUnits("16:00", "18:00")).toEqual({ units: 0.25, durationMinutes: 120 });
    expect(partialLeaveUnits("09:00", "13:00")).toEqual({ units: 0.5, durationMinutes: 240 });
    expect(partialLeaveUnits("18:00", "16:00")).toHaveProperty("error");
    expect(partialLeaveUnits("08:00", "17:00")).toHaveProperty("error");
  });
});

describe("leave review workflow", () => {
  it("allows rejection of an approved request while preserving its approval history step", () => {
    expect(canDecideLeave("APPROVED", "REJECTED")).toBe(true);
    expect(decisionStep("APPROVED")).toBe(2);
  });
  it("does not allow approving an already approved or a closed request", () => {
    expect(canDecideLeave("APPROVED", "APPROVED")).toBe(false);
    expect(canDecideLeave("REJECTED", "REJECTED")).toBe(false);
    expect(canDecideLeave("CANCELLED", "REJECTED")).toBe(false);
  });
});
