import { describe, expect, it } from "vitest";
import { canDecideLeaveForEmployee, canReviewTeamLeave, canViewEmployeeRecord, managerLeaveEmployeeIds, reportingWouldCycle } from "../src/lib/permissions/scope";

describe("resource-level RBAC", () => {
  it("allows an admin to review a request from any team in the company", () => {
    expect(canReviewTeamLeave({ isAdmin: true, isManager: false, managerEmployeeId: null, requestTeamId: "team-b", ledTeamIds: [] })).toBe(true);
  });
  it("allows a team lead to review requests for a team they lead", () => {
    expect(canReviewTeamLeave({ isAdmin: false, isManager: true, managerEmployeeId: "lead-1", requestTeamId: "team-a", ledTeamIds: ["team-a"] })).toBe(true);
  });
  it("denies a team lead access to another team's requests", () => {
    expect(canReviewTeamLeave({ isAdmin: false, isManager: true, managerEmployeeId: "lead-1", requestTeamId: "team-b", ledTeamIds: ["team-a"] })).toBe(false);
  });
  it("denies employee accounts approval privileges", () => {
    expect(canReviewTeamLeave({ isAdmin: false, isManager: false, managerEmployeeId: "employee-1", requestTeamId: "team-a", ledTeamIds: [] })).toBe(false);
  });
  it("allows an employee to view their own employee record but not another's", () => {
    expect(canViewEmployeeRecord({ isAdmin: false, isManager: false, requestedEmployeeId: "employee-1", ownEmployeeId: "employee-1", teamEmployeeIds: [] })).toBe(true);
    expect(canViewEmployeeRecord({ isAdmin: false, isManager: false, requestedEmployeeId: "employee-2", ownEmployeeId: "employee-1", teamEmployeeIds: [] })).toBe(false);
  });
  it("scopes manager employee records to team membership", () => {
    expect(canViewEmployeeRecord({ isAdmin: false, isManager: true, requestedEmployeeId: "employee-2", ownEmployeeId: "lead-1", teamEmployeeIds: ["employee-2"] })).toBe(true);
    expect(canViewEmployeeRecord({ isAdmin: false, isManager: true, requestedEmployeeId: "employee-3", ownEmployeeId: "lead-1", teamEmployeeIds: ["employee-2"] })).toBe(false);
  });
  it("includes a team lead's own leave alongside assigned team requests", () => {
    expect(managerLeaveEmployeeIds("lead-1", ["employee-1", "employee-2"])).toEqual(["employee-1", "employee-2", "lead-1"]);
    expect(managerLeaveEmployeeIds("lead-1", [])).toEqual(["lead-1"]);
    expect(managerLeaveEmployeeIds("lead-1", ["lead-1", "employee-2"])).toEqual(["lead-1", "employee-2"]);
  });
  it("prevents a reviewer from deciding their own leave request", () => {
    expect(canDecideLeaveForEmployee("lead-1", "lead-1")).toBe(false);
    expect(canDecideLeaveForEmployee("lead-1", "employee-2")).toBe(true);
    expect(canDecideLeaveForEmployee(null, "employee-2")).toBe(true);
  });
  it("rejects direct and indirect circular reporting chains", () => {
    const reporting = new Map([["employee-1", "lead-1"], ["lead-1", null]]);
    expect(reportingWouldCycle("employee-1", "lead-1", reporting)).toBe(false);
    expect(reportingWouldCycle("lead-1", "employee-1", reporting)).toBe(true);
    expect(reportingWouldCycle("employee-1", "employee-1", reporting)).toBe(true);
  });
});
