/** Pure resource-scope policy used by server handlers and unit tests. */
export function canReviewTeamLeave(input: {
  isAdmin: boolean;
  isManager: boolean;
  managerEmployeeId: string | null | undefined;
  requestTeamId: string | null | undefined;
  ledTeamIds: string[];
}): boolean {
  if (input.isAdmin) return true;
  if (!input.isManager || !input.managerEmployeeId || !input.requestTeamId) return false;
  return input.ledTeamIds.includes(input.requestTeamId);
}

export function canViewEmployeeRecord(input: {
  isAdmin: boolean;
  isManager: boolean;
  requestedEmployeeId: string;
  ownEmployeeId: string | null | undefined;
  teamEmployeeIds: string[];
}): boolean {
  if (input.isAdmin) return true;
  if (input.isManager) return input.teamEmployeeIds.includes(input.requestedEmployeeId);
  return Boolean(input.ownEmployeeId && input.requestedEmployeeId === input.ownEmployeeId);
}

export function managerLeaveEmployeeIds(ownEmployeeId: string | null | undefined, teamEmployeeIds: string[]): string[] {
  return [...new Set([...teamEmployeeIds, ...(ownEmployeeId ? [ownEmployeeId] : [])])];
}

export function canDecideLeaveForEmployee(reviewerEmployeeId: string | null | undefined, requestEmployeeId: string): boolean {
  return !reviewerEmployeeId || reviewerEmployeeId !== requestEmployeeId;
}

export function reportingWouldCycle(employeeId: string, managerId: string | null, managerByEmployeeId: Map<string, string | null>): boolean {
  const visited = new Set<string>();
  let current = managerId;
  while (current) {
    if (current === employeeId || visited.has(current)) return true;
    visited.add(current);
    current = managerByEmployeeId.get(current) ?? null;
  }
  return false;
}
