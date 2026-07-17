import { z } from "zod";

export const studentFormSchema = z
  .object({
    branchId: z.string(),

    studentNumber: z
      .string()
      .trim()
      .min(1, "Student number is required.")
      .max(50),

    firstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .max(100),

    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(100),

    birthDate: z.string(),

    gender: z.enum([
      "FEMALE",
      "MALE",
      "NON_BINARY",
      "UNSPECIFIED",
    ]),

    enrollmentDate: z.string(),

    medicalNotes: z
      .string()
      .trim()
      .max(5000),

    allergies: z
      .string()
      .trim()
      .max(5000),

    emergencyContactName: z
      .string()
      .trim()
      .max(200),

    emergencyContactPhone: z
      .string()
      .trim()
      .max(50),

    notes: z
      .string()
      .trim()
      .max(5000),
  })
  .superRefine((values, context) => {
    if (!values.birthDate) {
      return;
    }

    const birthDate = new Date(
      `${values.birthDate}T00:00:00`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate > today) {
      context.addIssue({
        code: "custom",
        path: ["birthDate"],
        message:
          "Birth date cannot be in the future.",
      });
    }
  });

export type StudentFormValues = z.infer<
  typeof studentFormSchema
>;
