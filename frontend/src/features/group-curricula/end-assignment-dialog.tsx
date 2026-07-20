"use client";

import { useEffect } from "react";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type {
  GroupCurriculumAssignment,
} from "./types";

const endAssignmentSchema = z.object({
  status: z.enum(["ENDED", "CANCELLED"]),

  endDate: z
    .string()
    .min(1, "End date is required."),

  reason: z.string().trim().max(500),
});

export type EndCurriculumAssignmentFormValues =
  z.infer<typeof endAssignmentSchema>;

type EndCurriculumAssignmentDialogProps = {
  assignment: GroupCurriculumAssignment;
  defaultEndDate: string;
  maximumEndDate: string;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: EndCurriculumAssignmentFormValues,
  ) => Promise<void>;
};

export function EndCurriculumAssignmentDialog({
  assignment,
  defaultEndDate,
  maximumEndDate,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: EndCurriculumAssignmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } =
    useForm<EndCurriculumAssignmentFormValues>({
      resolver: zodResolver(
        endAssignmentSchema,
      ),
      defaultValues: {
        status: "ENDED",
        endDate: defaultEndDate,
        reason: "",
      },
    });

  useEffect(() => {
    reset({
      status: "ENDED",
      endDate: defaultEndDate,
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
          End curriculum assignment
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {assignment.curriculumName} — Version{" "}
          {assignment.curriculumVersion}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="assignmentStatus"
              className="block text-sm font-medium"
            >
              Result
            </label>

            <select
              id="assignmentStatus"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("status")}
            >
              <option value="ENDED">Ended</option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="assignmentEndDate"
              className="block text-sm font-medium"
            >
              End date
            </label>

            <input
              id="assignmentEndDate"
              type="date"
              min={assignment.startDate}
              max={maximumEndDate}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("endDate")}
            />

            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="assignmentEndReason"
              className="block text-sm font-medium"
            >
              Reason or note
            </label>

            <textarea
              id="assignmentEndReason"
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
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "End assignment"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
