"use client";

import { useState } from "react";

type OpenCorrectionDialogProps = {
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function OpenCorrectionDialog({
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: OpenCorrectionDialogProps) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!trimmedReason) {
      return;
    }

    await onSubmit(trimmedReason);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-dialog-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2
          id="correction-dialog-title"
          className="text-xl font-semibold"
        >
          Open attendance correction
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Finalization will be temporarily removed. Every
          changed record will be stored in the correction
          history.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="correctionReason"
              className="block text-sm font-medium"
            >
              Correction reason
            </label>

            <textarea
              id="correctionReason"
              rows={5}
              maxLength={1000}
              required
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
            />

            <p className="mt-1 text-xs text-slate-500">
              {reason.length}/1000
            </p>
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
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting || !trimmedReason
              }
              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Opening..."
                : "Open correction"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
