export type LeaveDecision = "APPROVED" | "REJECTED";
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export function canDecideLeave(status: LeaveRequestStatus, action: LeaveDecision) {
  return status === "PENDING" || (status === "APPROVED" && action === "REJECTED");
}

export function decisionStep(status: LeaveRequestStatus) {
  return status === "APPROVED" ? 2 : 1;
}
