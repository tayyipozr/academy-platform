"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  endEnrollmentSchema,
  type EndEnrollmentFormValues,
} from "./end-enrollment-schema";

import type { GroupEnrollment } from "./types";

type EndEnrollmentDialogProps = {
  enrollment: GroupEnrollment;
  defaultEndDate: string;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: EndEnrollmentFormValues,
  ) => Promise<void>;
};

export function EndEnrollmentDialog({
  enrollment,
  defaultEndDate,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: EndEnrollmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EndEnrollmentFormValues>({
    resolver: zodResolver(endEnrollmentSchema),
    defaultValues: {
      status: "COMPLETED",
      endedAt: defaultEndDate,
      reason: "",
    },
  });

  useEffect(() => {
    reset({
      status: "COMPLETED",
      endedAt: defaultEndDate,
      reason: "",
    });
  }, [defaultEndDate, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          End enrollment
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {enrollment.firstName}{" "}
          {enrollment.lastName} —{" "}
          {enrollment.studentNumber}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="enrollmentStatus"
              className="block text-sm font-medium"
            >
              Result
            </label>

            <select
              id="enrollmentStatus"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("status")}
            >
              <option value="COMPLETED">
                Completed
              </option>
              <option value="WITHDRAWN">
                Withdrawn
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="enrollmentEndDate"
              className="block text-sm font-medium"
            >
              End date
            </label>

            <input
              id="enrollmentEndDate"
              type="date"
              min={enrollment.enrolledAt}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("endedAt")}
            />

            {errors.endedAt && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endedAt.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="enrollmentReason"
              className="block text-sm font-medium"
            >
              Reason or note
            </label>

            <textarea
              id="enrollmentReason"
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("reason")}
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
              {submitting
                ? "Saving..."
                : "End enrollment"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
