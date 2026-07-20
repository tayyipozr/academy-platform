"use client";

import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Branch } from "@/features/branches/types";
import type { Program } from "@/features/programs/types";
import type { OperationalTerm } from "@/features/terms/types";

import type { AcademyGroup } from "./types";

const groupFormSchema = z
  .object({
    branchId: z.string(),

    programId: z
      .string()
      .uuid("Select a program."),

    termId: z
      .string()
      .uuid("Select a term."),

    code: z
      .string()
      .trim()
      .min(1, "Group code is required.")
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Use letters, numbers, underscores, or hyphens only.",
      ),

    name: z
      .string()
      .trim()
      .min(1, "Group name is required.")
      .max(200),

    description: z.string().trim().max(5000),

    capacity: z
      .string()
      .refine(
        (value) =>
          Number.isInteger(Number(value)) &&
          Number(value) > 0,
        "Capacity must be a positive integer.",
      ),

    minimumAge: z.string(),
    maximumAge: z.string(),
  })
  .superRefine((values, context) => {
    if (
      values.minimumAge !== "" &&
      values.maximumAge !== "" &&
      Number(values.maximumAge) <
        Number(values.minimumAge)
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumAge"],
        message:
          "Maximum age cannot be less than minimum age.",
      });
    }
  });

export type GroupFormValues = z.infer<
  typeof groupFormSchema
>;

type GroupFormDialogProps = {
  group?: AcademyGroup;
  programs: Program[];
  terms: OperationalTerm[];
  branches: Branch[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: GroupFormValues,
  ) => Promise<void>;
};

export function GroupFormDialog({
  group,
  programs,
  terms,
  branches,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: GroupFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      branchId: "",
      programId: "",
      termId: "",
      code: "",
      name: "",
      description: "",
      capacity: "20",
      minimumAge: "",
      maximumAge: "",
    },
  });

  useEffect(() => {
    reset({
      branchId: group?.branchId ?? "",
      programId: group?.programId ?? "",
      termId: group?.termId ?? "",
      code: group?.code ?? "",
      name: group?.name ?? "",
      description: group?.description ?? "",
      capacity:
        group?.capacity.toString() ?? "20",
      minimumAge:
        group?.minimumAge?.toString() ?? "",
      maximumAge:
        group?.maximumAge?.toString() ?? "",
    });
  }, [group, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          {group ? "Edit group" : "Create group"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="programId"
              label="Program"
              error={errors.programId?.message}
              registration={register("programId")}
            >
              <option value="">
                Select a program
              </option>
              {programs
                .filter(
                  (program) =>
                    program.status === "ACTIVE",
                )
                .map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                  </option>
                ))}
            </SelectField>

            <SelectField
              id="termId"
              label="Term"
              error={errors.termId?.message}
              registration={register("termId")}
            >
              <option value="">Select a term</option>
              {terms
                .filter((term) =>
                  ["DRAFT", "ACTIVE"].includes(
                    term.status,
                  ),
                )
                .map((term) => (
                  <option
                    key={term.id}
                    value={term.id}
                  >
                    {term.name}
                  </option>
                ))}
            </SelectField>

            <SelectField
              id="branchId"
              label="Branch"
              error={errors.branchId?.message}
              registration={register("branchId")}
            >
              <option value="">No branch</option>
              {branches
                .filter(
                  (branch) =>
                    branch.status === "ACTIVE",
                )
                .map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
            </SelectField>

            <TextField
              id="code"
              label="Group code"
              error={errors.code?.message}
              registration={register("code")}
            />

            <TextField
              id="name"
              label="Group name"
              error={errors.name?.message}
              registration={register("name")}
            />

            <TextField
              id="capacity"
              label="Capacity"
              type="number"
              error={errors.capacity?.message}
              registration={register("capacity")}
            />

            <TextField
              id="minimumAge"
              label="Minimum age"
              type="number"
              error={errors.minimumAge?.message}
              registration={register("minimumAge")}
            />

            <TextField
              id="maximumAge"
              label="Maximum age"
              type="number"
              error={errors.maximumAge?.message}
              registration={register("maximumAge")}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("description")}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save group"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

import type {
  UseFormRegisterReturn,
} from "react-hook-form";

function TextField({
  id,
  label,
  error,
  registration,
  type = "text",
}: {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="mt-1 w-full rounded-lg border px-3 py-2"
        {...registration}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  error,
  registration,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>
      <select
        id={id}
        className="mt-1 w-full rounded-lg border px-3 py-2"
        {...registration}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
