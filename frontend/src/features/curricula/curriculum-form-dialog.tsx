"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Program } from "@/features/programs/types";

import {
  curriculumFormSchema,
  type CurriculumFormValues,
} from "./curriculum-form-schema";

import type { Curriculum } from "./types";

type CurriculumFormDialogProps = {
  curriculum?: Curriculum;
  programs: Program[];
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: CurriculumFormValues,
  ) => Promise<void>;
};

export function CurriculumFormDialog({
  curriculum,
  programs,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: CurriculumFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CurriculumFormValues>({
    resolver: zodResolver(
      curriculumFormSchema,
    ),
    defaultValues: {
      programId: "",
      code: "",
      name: "",
      description: "",
      versionLabel: "1.0",
    },
  });

  useEffect(() => {
    reset({
      programId: curriculum?.programId ?? "",
      code: curriculum?.code ?? "",
      name: curriculum?.name ?? "",
      description:
        curriculum?.description ?? "",
      versionLabel:
        curriculum?.versionLabel ?? "1.0",
    });
  }, [curriculum, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {curriculum
              ? "Edit curriculum"
              : "Create curriculum"}
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded px-2 py-1 text-slate-500"
          >
            Close
          </button>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="programId"
              className="block text-sm font-medium"
            >
              Program
            </label>

            <select
              id="programId"
              disabled={Boolean(curriculum)}
              className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
              {...register("programId")}
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
            </select>

            {errors.programId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.programId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="curriculumCode"
              label="Curriculum code"
              error={errors.code?.message}
            >
              <input
                id="curriculumCode"
                className="w-full rounded-lg border px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="versionLabel"
              label="Version"
              error={errors.versionLabel?.message}
            >
              <input
                id="versionLabel"
                placeholder="1.0"
                className="w-full rounded-lg border px-3 py-2"
                {...register("versionLabel")}
              />
            </FormField>
          </div>

          <FormField
            id="curriculumName"
            label="Curriculum name"
            error={errors.name?.message}
          >
            <input
              id="curriculumName"
              className="w-full rounded-lg border px-3 py-2"
              {...register("name")}
            />
          </FormField>

          <FormField
            id="curriculumDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="curriculumDescription"
              rows={5}
              className="w-full resize-y rounded-lg border px-3 py-2"
              {...register("description")}
            />
          </FormField>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-red-700"
            >
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
              {submitting
                ? "Saving..."
                : "Save curriculum"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function FormField({
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
