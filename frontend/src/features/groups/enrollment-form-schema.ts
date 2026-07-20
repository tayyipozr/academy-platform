import { z } from "zod";

export const enrollmentFormSchema = z.object({
  studentId: z
    .string()
    .uuid("Select a student."),

  enrolledAt: z
    .string()
    .min(1, "Enrollment date is required."),
});

export type EnrollmentFormValues = z.infer<
  typeof enrollmentFormSchema
>;
