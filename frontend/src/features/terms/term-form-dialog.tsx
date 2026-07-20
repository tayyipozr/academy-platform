"use client";

import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { OperationalTerm } from "./types";

const termFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Term code is required.")
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Use letters, numbers, underscores, or hyphens only.",
      ),

    name: z
      .string()
      .trim()
      .min(1, "Term name is required.")
      .max(200),

    startDate: z
      .string()
      .min(1, "Start date is required."),

    endDate: z
      .string()
      .min(1, "End date is required."),
  })
  .superRefine((values, context) => {
    if (
      values.startDate &&
      values.endDate &&
      values.endDate < values.startDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "End date cannot be before start date.",
      });
    }
  });

export type TermFormValues = z.infer<
  typeof termFormSchema
>;

type TermFormDialogProps = {
  term?: OperationalTerm;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: TermFormValues,
  ) => Promise<void>;
};

export function TermFormDialog({
  term,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: TermFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermFormValues>({
    resolver: zodResolver(termFormSchema),
    defaultValues: {
      code: "",
      name: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    reset({
      code: term?.code ?? "",
      name: term?.name ?? "",
      startDate: term?.startDate ?? "",
      endDate: term?.endDate ?? "",
    });
  }, [reset, term]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {term ? "Edit term" : "Create term"}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <InputField
            id="code"
            label="Term code"
            error={errors.code?.message}
          >
            <input
              id="code"
              className="w-full rounded-lg border px-3 py-2 uppercase"
              {...register("code")}
            />
          </InputField>

          <InputField
            id="name"
            label="Term name"
            error={errors.name?.message}
          >
            <input
              id="name"
              className="w-full rounded-lg border px-3 py-2"
              {...register("name")}
            />
          </InputField>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              id="startDate"
              label="Start date"
              error={errors.startDate?.message}
            >
              <input
                id="startDate"
                type="date"
                className="w-full rounded-lg border px-3 py-2"
                {...register("startDate")}
              />
            </InputField>

            <InputField
              id="endDate"
              label="End date"
              error={errors.endDate?.message}
            >
              <input
                id="endDate"
                type="date"
                className="w-full rounded-lg border px-3 py-2"
                {...register("endDate")}
              />
            </InputField>
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
              {submitting ? "Saving..." : "Save term"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
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

      <div className="mt-1">{children}</div>

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
