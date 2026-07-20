import { z } from "zod";

export const staffAssignmentSchema = z.object({
  staffId: z
    .string()
    .uuid("Select a staff member."),

  assignmentRole: z.enum([
    "PRIMARY_INSTRUCTOR",
    "ASSISTANT_INSTRUCTOR",
  ]),

  startDate: z
    .string()
    .min(1, "Start date is required."),
});

export type StaffAssignmentFormValues = z.infer<
  typeof staffAssignmentSchema
>;
