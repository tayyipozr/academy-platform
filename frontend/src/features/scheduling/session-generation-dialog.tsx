"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  sessionGenerationSchema,
  type SessionGenerationFormValues,
} from "./session-generation-schema";

import type {
  ScheduleRule,
  SessionGenerationResponse,
} from "./types";

type SessionGenerationDialogProps = {
  rule: ScheduleRule;
  submitting: boolean;
  result?: SessionGenerationResponse | null;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: SessionGenerationFormValues,
  ) => Promise<void>;
};

export function SessionGenerationDialog({
  rule,
  submitting,
  result,
  errorMessage,
  onClose,
  onSubmit,
}: SessionGenerationDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SessionGenerationFormValues>({
    resolver: zodResolver(
      sessionGenerationSchema,
    ),
    defaultValues: {
      dateFrom: rule.effectiveFrom,
      dateTo: rule.effectiveUntil,
    },
  });

  useEffect(() => {
    reset({
      dateFrom: rule.effectiveFrom,
      dateTo: rule.effectiveUntil,
    });
  }, [reset, rule]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Generate sessions
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {rule.title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {dayLabel(rule.dayOfWeek)} ·{" "}
          {formatTime(rule.startTime)} –{" "}
          {formatTime(rule.endTime)} ·{" "}
          {rule.timezone}
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="generationFrom"
                className="block text-sm font-medium"
              >
                Date from
              </label>

              <input
                id="generationFrom"
                type="date"
                min={rule.effectiveFrom}
                max={rule.effectiveUntil}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...register("dateFrom")}
              />

              {errors.dateFrom && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.dateFrom.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="generationTo"
                className="block text-sm font-medium"
              >
                Date to
              </label>

              <input
                id="generationTo"
                type="date"
                min={rule.effectiveFrom}
                max={rule.effectiveUntil}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...register("dateTo")}
              />

              {errors.dateTo && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.dateTo.message}
                </p>
              )}
            </div>
          </div>

          {result && (
            <section className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <p>
                Matching dates:{" "}
                <strong>
                  {result.matchedDateCount}
                </strong>
              </p>

              <p>
                Generated sessions:{" "}
                <strong>
                  {result.generatedSessionCount}
                </strong>
              </p>

              <p>
                Skipped existing/conflicting sessions:{" "}
                <strong>
                  {result.skippedSessionCount}
                </strong>
              </p>
            </section>
          )}

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
              Close
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Generating..."
                : "Generate sessions"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function dayLabel(day: number): string {
  return [
    "",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ][day];
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}
