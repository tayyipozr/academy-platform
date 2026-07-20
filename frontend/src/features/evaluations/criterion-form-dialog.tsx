"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  useForm,
  useWatch,
} from "react-hook-form";

import {
  evaluationCriterionFormSchema,
  type EvaluationCriterionFormValues,
} from "./criterion-form-schema";

import type {
  EvaluationCriterion,
} from "./types";

type CriterionFormDialogProps = {
  criterion?: EvaluationCriterion;
  criterionCount: number;
  currentTotalWeight: number;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: EvaluationCriterionFormValues,
  ) => Promise<void>;
};

export function CriterionFormDialog({
  criterion,
  criterionCount,
  currentTotalWeight,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: CriterionFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EvaluationCriterionFormValues>({
    resolver: zodResolver(
      evaluationCriterionFormSchema,
    ),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      weightPercentage: "",
      sequenceNumber: String(
        criterionCount + 1,
      ),
    },
  });

  useEffect(() => {
    reset({
      code: criterion?.code ?? "",
      name: criterion?.name ?? "",
      description:
        criterion?.description ?? "",
      weightPercentage:
        criterion?.weightPercentage.toString() ??
        "",
      sequenceNumber:
        criterion?.sequenceNumber.toString() ??
        String(criterionCount + 1),
    });
  }, [criterion, criterionCount, reset]);

  const watchedWeightValue = useWatch({
    control,
    name: "weightPercentage",
  });

  const watchedWeight = Number(
    watchedWeightValue || 0,
  );

  const weightWithoutCurrent =
    currentTotalWeight -
    (criterion?.weightPercentage ?? 0);

  const projectedTotal =
    weightWithoutCurrent +
    (
      Number.isFinite(watchedWeight)
        ? watchedWeight
        : 0
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="criterion-form-title"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4">
          <h2
            id="criterion-form-title"
            className="text-xl font-semibold"
          >
            {criterion
              ? "Edit evaluation criterion"
              : "Create evaluation criterion"}
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="criterionCode"
              label="Criterion code"
              error={errors.code?.message}
            >
              <input
                id="criterionCode"
                className="w-full rounded-lg border px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="criterionSequence"
              label="Sequence"
              error={
                errors.sequenceNumber?.message
              }
            >
              <input
                id="criterionSequence"
                type="number"
                min={1}
                className="w-full rounded-lg border px-3 py-2"
                {...register("sequenceNumber")}
              />
            </FormField>
          </div>

          <FormField
            id="criterionName"
            label="Criterion name"
            error={errors.name?.message}
          >
            <input
              id="criterionName"
              className="w-full rounded-lg border px-3 py-2"
              {...register("name")}
            />
          </FormField>

          <FormField
            id="criterionWeight"
            label="Weight percentage"
            error={
              errors.weightPercentage?.message
            }
          >
            <input
              id="criterionWeight"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              className="w-full rounded-lg border px-3 py-2"
              {...register("weightPercentage")}
            />

            <p
              className={`mt-2 text-sm ${projectedTotal > 100
                ? "text-red-700"
                : projectedTotal === 100
                  ? "text-green-700"
                  : "text-slate-500"
                }`}
            >
              Projected total weight:{" "}
              {projectedTotal.toFixed(2)}%
            </p>
          </FormField>

          <FormField
            id="criterionDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="criterionDescription"
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
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting || projectedTotal > 100
              }
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Save criterion"}
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
