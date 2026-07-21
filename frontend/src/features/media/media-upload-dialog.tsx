"use client";

import { useState } from "react";

import {
  completeMediaUpload,
  createMediaLink,
  initializeMediaUpload,
} from "./api";

import {
  uploadToSignedUrl,
} from "./direct-upload";

import type {
  MediaFile,
  MediaPurpose,
  MediaTarget,
} from "./types";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

const acceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];

type MediaUploadDialogProps = {
  target?: MediaTarget;
  onClose: () => void;
  onCompleted: (media: MediaFile) => Promise<void>;
};

export function MediaUploadDialog({
  target,
  onClose,
  onCompleted,
}: MediaUploadDialogProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [caption, setCaption] =
    useState("");

  const [purpose, setPurpose] =
    useState<MediaPurpose>("INTERNAL");

  const [coverMedia, setCoverMedia] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!file) {
      setError("Select a file.");
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError("This file type is not supported.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(0);

    try {
      const upload =
        await initializeMediaUpload({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          title: title.trim() || null,
          description:
            description.trim() || null,
        });

      await uploadToSignedUrl(
        upload.uploadUrl,
        file,
        upload.requiredHeaders,
        setProgress,
      );

      const completed =
        await completeMediaUpload(
          upload.mediaId,
        );

      if (target) {
        await createMediaLink(
          completed.id,
          {
            targetType: target.type,
            targetId: target.id,
            purpose,
            caption: caption.trim() || null,
            coverMedia,
          },
        );
      }

      await onCompleted(completed);
      onClose();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The media file could not be uploaded.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Upload media
          </h2>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="text-slate-500"
          >
            Close
          </button>
        </header>

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="mediaFile"
              className="block text-sm font-medium"
            >
              File
            </label>

            <input
              id="mediaFile"
              type="file"
              required
              disabled={submitting}
              accept={acceptedTypes.join(",")}
              onChange={(event) =>
                setFile(
                  event.target.files?.[0] ?? null,
                )
              }
              className="mt-1 block w-full rounded-lg border p-3"
            />

            {file && (
              <p className="mt-2 text-sm text-slate-500">
                {file.name} ·{" "}
                {formatFileSize(file.size)}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="mediaTitle"
              label="Title"
            >
              <input
                id="mediaTitle"
                value={title}
                maxLength={200}
                disabled={submitting}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </Field>

            {target && (
              <Field
                id="mediaPurpose"
                label="Purpose"
              >
                <select
                  id="mediaPurpose"
                  value={purpose}
                  disabled={submitting}
                  onChange={(event) =>
                    setPurpose(
                      event.target
                        .value as MediaPurpose,
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="INTERNAL">
                    Internal portal
                  </option>
                  <option value="MARKETING">
                    Marketing
                  </option>
                </select>
              </Field>
            )}
          </div>

          <Field
            id="mediaDescription"
            label="Description"
          >
            <textarea
              id="mediaDescription"
              rows={3}
              maxLength={5000}
              value={description}
              disabled={submitting}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              className="w-full resize-y rounded-lg border px-3 py-2"
            />
          </Field>

          {target && (
            <>
              <Field
                id="mediaCaption"
                label="Gallery caption"
              >
                <textarea
                  id="mediaCaption"
                  rows={3}
                  maxLength={1000}
                  value={caption}
                  disabled={submitting}
                  onChange={(event) =>
                    setCaption(
                      event.target.value,
                    )
                  }
                  className="w-full resize-y rounded-lg border px-3 py-2"
                />
              </Field>

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

                <span>
                  <span className="block text-sm font-medium">
                    Use as cover media
                  </span>

                  <span className="text-xs text-slate-500">
                    Replaces the current cover media for
                    this entity.
                  </span>
                </span>
              </label>
            </>
          )}

          {submitting && (
            <div>
              <div className="flex justify-between text-sm">
                <span>Upload progress</span>
                <span>{progress}%</span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
              {error}
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
              disabled={submitting || !file}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Uploading..."
                : "Upload media"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <div className="mt-1">{children}</div>
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
