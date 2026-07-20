"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { StaffMember } from "@/features/staff/types";

import {
  staffAssignmentSchema,
  type StaffAssignmentFormValues,
} from "./staff-assignment-schema";

type StaffAssignmentDialogProps = {
  staff: StaffMember[];
  defaultStartDate: string;
  hasPrimaryInstructor: boolean;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: StaffAssignmentFormValues,
  ) => Promise<void>;
};

export function StaffAssignmentDialog({
  staff,
  defaultStartDate,
  hasPrimaryInstructor,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: StaffAssignmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffAssignmentFormValues>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      staffId: "",
      assignmentRole: hasPrimaryInstructor
        ? "ASSISTANT_INSTRUCTOR"
        : "PRIMARY_INSTRUCTOR",
      startDate: defaultStartDate,
    },
  });

  useEffect(() => {
    reset({
      staffId: "",
      assignmentRole: hasPrimaryInstructor
        ? "ASSISTANT_INSTRUCTOR"
        : "PRIMARY_INSTRUCTOR",
      startDate: defaultStartDate,
    });
  }, [
    defaultStartDate,
    hasPrimaryInstructor,
    reset,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Assign instructor
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="staffId"
              className="block text-sm font-medium"
            >
              Staff member
            </label>

            <select
              id="staffId"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("staffId")}
            >
              <option value="">
                Select an instructor
              </option>

              {staff.map((staffMember) => (
                <option
                  key={staffMember.id}
                  value={staffMember.id}
                >
                  {staffMember.firstName}{" "}
                  {staffMember.lastName} —{" "}
                  {staffMember.staffNumber}
                </option>
              ))}
            </select>

            {errors.staffId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.staffId.message}
              </p>
            )}

            {staff.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                No eligible active instructors are available.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="assignmentRole"
              className="block text-sm font-medium"
            >
              Assignment role
            </label>

            <select
              id="assignmentRole"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("assignmentRole")}
            >
              {!hasPrimaryInstructor && (
                <option value="PRIMARY_INSTRUCTOR">
                  Primary instructor
                </option>
              )}

              <option value="ASSISTANT_INSTRUCTOR">
                Assistant instructor
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="assignmentStartDate"
              className="block text-sm font-medium"
            >
              Start date
            </label>

            <input
              id="assignmentStartDate"
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("startDate")}
            />

            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
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
              disabled={
                submitting || staff.length === 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Assigning..."
                : "Assign instructor"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
