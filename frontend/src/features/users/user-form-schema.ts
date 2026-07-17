import { z } from "zod";

export type UserFormMode =
  | "create"
  | "invite"
  | "edit";

export const userFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address."),

  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name is too long."),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name is too long."),

  // Always a string to keep the form type consistent.
  temporaryPassword: z.string(),

  roleIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one role."),
});

export type UserFormValues = z.infer<
  typeof userFormSchema
>;

export function createUserFormSchema(
  mode: UserFormMode,
) {
  return userFormSchema.superRefine(
    (values, context) => {
      if (
        mode === "create" &&
        values.temporaryPassword.length < 12
      ) {
        context.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message:
            "The temporary password must contain at least 12 characters.",
        });
      }

      if (
        mode === "create" &&
        values.temporaryPassword.length > 100
      ) {
        context.addIssue({
          code: "custom",
          path: ["temporaryPassword"],
          message:
            "The temporary password cannot exceed 100 characters.",
        });
      }
    },
  );
}