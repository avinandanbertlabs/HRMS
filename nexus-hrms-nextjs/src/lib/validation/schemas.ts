import { z } from "zod";
import { countWords } from "./word-count";
export const employeeSchema = z.object({ employeeCode: z.string().trim().min(1).max(32), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.string().email(), departmentId: z.string().optional(), designationId: z.string().optional(), teamId: z.string().optional() });
export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  partialStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  partialEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  units: z.number().positive().max(365).optional(),
  reason: z.string().trim().min(5).max(10000).refine(value => countWords(value) <= 500, { message: "Reason must be 500 words or fewer." }),
})
  .refine(v => v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after start date" })
  .refine(v => Boolean(v.partialStartTime) === Boolean(v.partialEndTime), { path: ["partialEndTime"], message: "Enter both start and end times for partial-day leave." })
  .refine(v => !v.partialStartTime || v.startDate.toISOString().slice(0, 10) === v.endDate.toISOString().slice(0, 10), { path: ["endDate"], message: "Partial-day leave must be for a single date." });

export const employeeProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  workEmail: z.union([z.string().trim().email(), z.literal("")]).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  joinedAt: z.string().date().nullable().optional(),
  teamId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  designationId: z.string().nullable().optional(),
  reportsToId: z.string().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Provide at least one profile field to update." });
