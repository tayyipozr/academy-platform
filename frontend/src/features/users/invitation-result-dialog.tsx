"use client";

import { useState } from "react";

import type { UserInvitationResponse } from "./types";

type InvitationResultDialogProps = {
  invitation: UserInvitationResponse;
  onClose: () => void;
};

export function InvitationResultDialog({
  invitation,
  onClose,
}: InvitationResultDialogProps) {
  const [copied, setCopied] = useState(false);

  const invitationUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/invitations/accept?token=${encodeURIComponent(
          invitation.token,
        )}`;

  async function copyInvitationUrl() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-result-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2
          id="invitation-result-title"
          className="text-xl font-semibold text-slate-900"
        >
          Invitation created
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          The invitation expires on{" "}
          {new Date(invitation.expiresAt).toLocaleString()}.
        </p>

        <div className="mt-5">
          <label
            htmlFor="invitationUrl"
            className="block text-sm font-medium text-slate-700"
          >
            Invitation URL
          </label>

          <textarea
            id="invitationUrl"
            readOnly
            value={invitationUrl}
            rows={4}
            className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm"
          />
        </div>

        <div className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          This URL contains a security token. Do not publish it or
          store it in application logs.
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2"
          >
            Close
          </button>

          <button
            type="button"
            onClick={copyInvitationUrl}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
      </div>
    </div>
  );
}
