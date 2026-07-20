"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  unitProgressSchema,
  type UnitProgressFormValues,
} from "./unit-progress-schema";

import type {
  CurriculumUnitProgress,
} from "./types";

type UnitProgressDialogProps = {
  unit: CurriculumUnitProgress;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: UnitProgressFormValues,
  ) => Promise<void>;
};

export function UnitProgressDialog({
  unit,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: UnitProgressDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitProgressFormValues>({
    resolver: zodResolver(unitProgressSchema),
    defaultValues: {
      status: unit.status,
      completedSessions:
        unit.completedSessions.toString(),
    },
  });

  useEffect(() => {
    reset({
      status: unit.status,
      completedSessions:
        unit.completedSessions.toString(),
    });
  }, [reset, unit]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Update curriculum progress
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {unit.sequenceNumber}. {unit.unitTitle}
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="unitProgressStatus"
              className="block text-sm font-medium"
            >
              Status
            </label>

            <select
              id="unitProgressStatus"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("status")}
            >
              <option value="NOT_STARTED">
                Not started
              </option>

              <option value="IN_PROGRESS">
                In progress
              </option>

              <option value="COMPLETED">
                Completed
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="completedSessions"
              className="block text-sm font-medium"
            >
              Completed sessions
            </label>

            <input
              id="completedSessions"
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("completedSessions")}
            />

            {errors.completedSessions && (
              <p className="mt-1 text-sm text-red-600">
                {
                  errors.completedSessions
                    .message
                }
              </p>
            )}

            <p className="mt-1 text-xs text-slate-500">
              Estimated sessions:{" "}
              {unit.estimatedSessions ?? "Not defined"}
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
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
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Save progress"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
