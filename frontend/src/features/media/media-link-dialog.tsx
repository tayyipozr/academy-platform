"use client";

import { useState } from "react";

import type {
  MediaLink,
  MediaPurpose,
} from "./types";

type MediaLinkDialogProps = {
  link: MediaLink;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: {
    purpose: MediaPurpose;
    caption: string | null;
    coverMedia: boolean;
  }) => Promise<void>;
};

export function MediaLinkDialog({
  link,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: MediaLinkDialogProps) {
  const [purpose, setPurpose] =
    useState<MediaPurpose>(link.purpose);

  const [caption, setCaption] =
    useState(link.caption ?? "");

  const [coverMedia, setCoverMedia] =
    useState(link.coverMedia);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await onSubmit({
      purpose,
      caption: caption.trim() || null,
      coverMedia,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">
          Edit media link
        </h2>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium">
              Purpose
            </label>

            <select
              value={purpose}
              disabled={submitting}
              onChange={(event) =>
                setPurpose(
                  event.target
                    .value as MediaPurpose,
                )
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              <option value="INTERNAL">
                Internal portal
              </option>
              <option value="MARKETING">
                Marketing
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Caption
            </label>

            <textarea
              rows={4}
              maxLength={1000}
              value={caption}
              disabled={submitting}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={coverMedia}
              disabled={submitting}
              onChange={(event) =>
                setCoverMedia(
                  event.target.checked,
                )
              }
            />

            Use as cover media
          </label>

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
              Save link
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
