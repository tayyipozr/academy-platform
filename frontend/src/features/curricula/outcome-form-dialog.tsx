"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  outcomeFormSchema,
  type OutcomeFormValues,
} from "./outcome-form-schema";

import type { LearningOutcome } from "./types";

type OutcomeFormDialogProps = {
  outcome?: LearningOutcome;
  currentOutcomeCount: number;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: OutcomeFormValues,
  ) => Promise<void>;
};

export function OutcomeFormDialog({
  outcome,
  currentOutcomeCount,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: OutcomeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OutcomeFormValues>({
    resolver: zodResolver(outcomeFormSchema),
    defaultValues: {
      code: "",
      title: "",
      description: "",
      sequenceNumber: "1",
    },
  });

  useEffect(() => {
    reset({
      code: outcome?.code ?? "",
      title: outcome?.title ?? "",
      description: outcome?.description ?? "",
      sequenceNumber:
        outcome?.sequenceNumber.toString() ??
        String(currentOutcomeCount + 1),
    });
  }, [
    currentOutcomeCount,
    outcome,
    reset,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          {outcome
            ? "Edit learning outcome"
            : "Create learning outcome"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="outcomeCode"
              label="Outcome code"
              error={errors.code?.message}
            >
              <input
                id="outcomeCode"
                className="w-full rounded-lg border px-3 py-2 uppercase"
                {...register("code")}
              />
            </FormField>

            <FormField
              id="outcomeSequence"
              label="Sequence"
              error={
                errors.sequenceNumber?.message
              }
            >
              <input
                id="outcomeSequence"
                type="number"
                min={1}
                className="w-full rounded-lg border px-3 py-2"
                {...register("sequenceNumber")}
              />
            </FormField>
          </div>

          <FormField
            id="outcomeTitle"
            label="Outcome"
            error={errors.title?.message}
          >
            <input
              id="outcomeTitle"
              className="w-full rounded-lg border px-3 py-2"
              {...register("title")}
            />
          </FormField>

          <FormField
            id="outcomeDescription"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="outcomeDescription"
              rows={4}
              className="w-full rounded-lg border px-3 py-2"
              {...register("description")}
            />
          </FormField>

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
              {submitting
                ? "Saving..."
                : "Save outcome"}
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
