"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  rescheduleSessionSchema,
  type RescheduleSessionFormValues,
} from "./reschedule-session-schema";

import type { LessonSession } from "./types";

type RescheduleSessionDialogProps = {
  session: LessonSession;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: RescheduleSessionFormValues,
  ) => Promise<void>;
};

export function RescheduleSessionDialog({
  session,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: RescheduleSessionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RescheduleSessionFormValues>({
    resolver: zodResolver(
      rescheduleSessionSchema,
    ),
  });

  useEffect(() => {
    reset({
      scheduledStart: toDateTimeLocal(
        session.scheduledStart,
      ),
      scheduledEnd: toDateTimeLocal(
        session.scheduledEnd,
      ),
      location: session.location ?? "",
    });
  }, [reset, session]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Reschedule session
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {session.title}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label
              htmlFor="rescheduledStart"
              className="block text-sm font-medium"
            >
              Scheduled start
            </label>

            <input
              id="rescheduledStart"
              type="datetime-local"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("scheduledStart")}
            />

            {errors.scheduledStart && (
              <p className="mt-1 text-sm text-red-600">
                {errors.scheduledStart.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="rescheduledEnd"
              className="block text-sm font-medium"
            >
              Scheduled end
            </label>

            <input
              id="rescheduledEnd"
              type="datetime-local"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("scheduledEnd")}
            />

            {errors.scheduledEnd && (
              <p className="mt-1 text-sm text-red-600">
                {errors.scheduledEnd.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="rescheduledLocation"
              className="block text-sm font-medium"
            >
              Location
            </label>

            <input
              id="rescheduledLocation"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...register("location")}
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Reschedule"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function toDateTimeLocal(
  dateTime: string,
): string {
  const date = new Date(dateTime);

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}
