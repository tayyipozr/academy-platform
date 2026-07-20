"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Curriculum } from "@/features/curricula/types";

import {
  curriculumAssignmentFormSchema,
  type CurriculumAssignmentFormValues,
} from "./assignment-form-schema";

type CurriculumAssignmentDialogProps = {
  mode: "assign" | "replace";
  curricula: Curriculum[];
  currentCurriculumId?: string;
  defaultDate: string;
  minimumDate: string;
  maximumDate: string;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: CurriculumAssignmentFormValues,
  ) => Promise<void>;
};

export function CurriculumAssignmentDialog({
  mode,
  curricula,
  currentCurriculumId,
  defaultDate,
  minimumDate,
  maximumDate,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: CurriculumAssignmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CurriculumAssignmentFormValues>({
    resolver: zodResolver(
      curriculumAssignmentFormSchema,
    ),
    defaultValues: {
      curriculumId: "",
      operationDate: defaultDate,
      reason: "",
    },
  });

  useEffect(() => {
    reset({
      curriculumId: "",
      operationDate: defaultDate,
      reason: "",
    });
  }, [defaultDate, mode, reset]);

  const availableCurricula = curricula.filter(
    (curriculum) =>
      curriculum.status === "ACTIVE" &&
      curriculum.id !== currentCurriculumId,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curriculum-assignment-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2
            id="curriculum-assignment-title"
            className="text-xl font-semibold"
          >
            {mode === "assign"
              ? "Assign curriculum"
              : "Replace curriculum"}
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
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="curriculumId"
              className="block text-sm font-medium"
            >
              Curriculum
            </label>

            <select
              id="curriculumId"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register("curriculumId")}
            >
              <option value="">
                Select an active curriculum
              </option>

              {availableCurricula.map(
                (curriculum) => (
                  <option
                    key={curriculum.id}
                    value={curriculum.id}
                  >
                    {curriculum.name} — Version{" "}
                    {curriculum.versionLabel}
                  </option>
                ),
              )}
            </select>

            {errors.curriculumId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.curriculumId.message}
              </p>
            )}

            {availableCurricula.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                There is no eligible active curriculum for
                this group&apos;s program.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="operationDate"
              className="block text-sm font-medium"
            >
              {mode === "assign"
                ? "Assignment date"
                : "Replacement date"}
            </label>

            <input
              id="operationDate"
              type="date"
              min={minimumDate}
              max={maximumDate}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register("operationDate")}
            />

            {errors.operationDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.operationDate.message}
              </p>
            )}
          </div>

          {mode === "replace" && (
            <div>
              <label
                htmlFor="replacementReason"
                className="block text-sm font-medium"
              >
                Replacement reason
              </label>

              <textarea
                id="replacementReason"
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
                {...register("reason")}
              />

              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.reason.message}
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <footer className="flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                availableCurricula.length === 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : mode === "assign"
                  ? "Assign curriculum"
                  : "Replace curriculum"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
