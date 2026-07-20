"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Student } from "@/features/students/types";

import {
  enrollmentFormSchema,
  type EnrollmentFormValues,
} from "./enrollment-form-schema";

type EnrollmentDialogProps = {
  students: Student[];
  defaultEnrollmentDate: string;
  availablePlaces: number;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: EnrollmentFormValues,
  ) => Promise<void>;
};

export function EnrollmentDialog({
  students,
  defaultEnrollmentDate,
  availablePlaces,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: EnrollmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      studentId: "",
      enrolledAt: defaultEnrollmentDate,
    },
  });

  useEffect(() => {
    reset({
      studentId: "",
      enrolledAt: defaultEnrollmentDate,
    });
  }, [defaultEnrollmentDate, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enrollment-dialog-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2
            id="enrollment-dialog-title"
            className="text-xl font-semibold"
          >
            Enroll student
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded px-2 py-1 text-slate-500"
          >
            Close
          </button>
        </header>

        <p className="mt-3 text-sm text-slate-600">
          Available places:{" "}
          <strong>{availablePlaces}</strong>
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="studentId"
              className="block text-sm font-medium"
            >
              Student
            </label>

            <select
              id="studentId"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register("studentId")}
            >
              <option value="">
                Select a student
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.firstName}{" "}
                  {student.lastName} —{" "}
                  {student.studentNumber}
                </option>
              ))}
            </select>

            {errors.studentId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.studentId.message}
              </p>
            )}

            {students.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                No eligible active students are available.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="enrolledAt"
              className="block text-sm font-medium"
            >
              Enrollment date
            </label>

            <input
              id="enrolledAt"
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register("enrolledAt")}
            />

            {errors.enrolledAt && (
              <p className="mt-1 text-sm text-red-600">
                {errors.enrolledAt.message}
              </p>
            )}
          </div>

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
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                students.length === 0 ||
                availablePlaces <= 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Enrolling..."
                : "Enroll student"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
