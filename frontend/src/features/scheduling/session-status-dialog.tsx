"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import {
  sessionStatusSchema,
  type SessionStatusFormValues,
} from "./session-status-schema";

import type {
  LessonSession,
  SessionStatus,
} from "./types";

type SessionStatusDialogProps = {
  session: LessonSession;
  targetStatus: SessionStatus;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: SessionStatusFormValues,
  ) => Promise<void>;
};

export function SessionStatusDialog({
  session,
  targetStatus,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: SessionStatusDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SessionStatusFormValues>({
    resolver: zodResolver(sessionStatusSchema),
    defaultValues: {
      status: targetStatus,
      completionNotes:
        session.completionNotes ?? "",
      cancellationReason:
        session.cancellationReason ?? "",
    },
  });

  useEffect(() => {
    reset({
      status: targetStatus,
      completionNotes:
        session.completionNotes ?? "",
      cancellationReason:
        session.cancellationReason ?? "",
    });
  }, [reset, session, targetStatus]);

  const status = useWatch({
    control,
    name: "status",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Update session status
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {session.title}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            type="hidden"
            {...register("status")}
          />

          <p className="rounded-lg bg-slate-100 p-3 text-sm">
            New status:{" "}
            <strong>
              {targetStatus.replaceAll("_", " ")}
            </strong>
          </p>

          {status === "COMPLETED" && (
            <div>
              <label
                htmlFor="completionNotes"
                className="block text-sm font-medium"
              >
                Instructor completion notes
              </label>

              <textarea
                id="completionNotes"
                rows={5}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...register("completionNotes")}
              />
            </div>
          )}

          {status === "CANCELLED" && (
            <div>
              <label
                htmlFor="cancellationReason"
                className="block text-sm font-medium"
              >
                Cancellation reason
              </label>

              <textarea
                id="cancellationReason"
                rows={4}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...register("cancellationReason")}
              />

              {errors.cancellationReason && (
                <p className="mt-1 text-sm text-red-600">
                  {
                    errors.cancellationReason
                      .message
                  }
                </p>
              )}
            </div>
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
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Update status"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
