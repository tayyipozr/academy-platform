import { z } from "zod";

export const branchFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Branch code is required.")
    .max(50)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Use letters, numbers, underscores, or hyphens only.",
    ),

  name: z
    .string()
    .trim()
    .min(1, "Branch name is required.")
    .max(200),

  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .or(z.literal("")),

  phone: z.string().trim().max(50),
  addressLine1: z.string().trim().max(250),
  addressLine2: z.string().trim().max(250),
  city: z.string().trim().max(100),
  stateProvince: z.string().trim().max(100),
  postalCode: z.string().trim().max(30),

  countryCode: z
    .string()
    .trim()
    .regex(
      /^$|^[A-Za-z]{2}$/,
      "Country code must contain two letters.",
    ),

  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(100),
});

export type BranchFormValues = z.infer<
  typeof branchFormSchema
>;
