const DAY_MS = 24 * 60 * 60 * 1000;

export function countWorkingDays(startDate: Date, endDate: Date, holidays: Set<string> = new Set()) {
  if (endDate < startDate) return 0;
  const date = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  let count = 0;
  while (date.getTime() <= end) {
    const day = date.getUTCDay();
    const dateKey = date.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidays.has(dateKey)) count++;
    date.setTime(date.getTime() + DAY_MS);
  }
  return count;
}

export function indiaCalendarDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateDaysBefore(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function leaveBackdateError(leaveTypeCode: string, startDate: string, today: string) {
  if (startDate < today && leaveTypeCode.toUpperCase() !== "SICK") {
    return "Only sick leave can be backdated.";
  }
  if (leaveTypeCode.toUpperCase() === "SICK" && startDate < dateDaysBefore(today, 7)) {
    return "Sick leave can be backdated by no more than 7 calendar days.";
  }
  return null;
}

export function partialLeaveUnits(startTime: string, endTime: string) {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const durationMinutes = toMinutes(endTime) - toMinutes(startTime);
  if (durationMinutes <= 0) return { error: "End time must be later than start time." } as const;
  if (durationMinutes > 8 * 60) return { error: "Partial-day leave cannot exceed 8 working hours." } as const;
  return { units: Math.round((durationMinutes / (8 * 60)) * 100) / 100, durationMinutes } as const;
}
