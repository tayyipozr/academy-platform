import { z } from "zod";

export const staffFormSchema = z
  .object({
    membershipId: z
      .string()
      .uuid("Select an instructor account."),

    branchId: z.string(),

    staffNumber: z
      .string()
      .trim()
      .min(1, "Staff number is required.")
      .max(50),

    title: z.string().trim().max(100),

    specialization: z
      .string()
      .trim()
      .max(200),

    biography: z
      .string()
      .trim()
      .max(5000),

    hiredAt: z.string(),

    endedAt: z.string(),
  })
  .superRefine((values, context) => {
    if (
      values.hiredAt &&
      values.endedAt &&
      values.endedAt < values.hiredAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["endedAt"],
        message:
          "The end date cannot be before the hire date.",
      });
    }
  });

export type StaffFormValues = z.infer<
  typeof staffFormSchema
>;
