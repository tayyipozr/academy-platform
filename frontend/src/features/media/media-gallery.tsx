"use client";

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  deleteMediaLink,
  getGuardianStudentMedia,
  getTargetMedia,
  updateMediaLink,
} from "./api";

import {
  MediaLinkDialog,
} from "./media-link-dialog";

import {
  MediaPreview,
} from "./media-preview";

import {
  MediaUploadDialog,
} from "./media-upload-dialog";

import {
  mediaQueryKeys,
} from "./query-keys";

import type {
  MediaLink,
  MediaTarget,
} from "./types";

import {
  getApiErrorMessage,
} from "@/lib/api/error-message";

type MediaGalleryProps = {
  target: MediaTarget;
  title?: string;
  canUpload: boolean;
  canManage: boolean;
  guardianMode?: boolean;
};

export function MediaGallery({
  target,
  title = "Media gallery",
  canUpload,
  canManage,
  guardianMode = false,
}: MediaGalleryProps) {
  const queryClient = useQueryClient();

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [editingLink, setEditingLink] =
    useState<MediaLink | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const galleryQuery = useQuery({
    queryKey: guardianMode
      ? mediaQueryKeys.guardianStudent(
          target.id,
        )
      : mediaQueryKeys.target(
          target.type,
          target.id,
        ),

    queryFn: () =>
      guardianMode
        ? getGuardianStudentMedia(target.id)
        : getTargetMedia(
            target.type,
            target.id,
          ),
  });

  const updateMutation = useMutation({
    mutationFn: (values: {
      purpose: "INTERNAL" | "MARKETING";
      caption: string | null;
      coverMedia: boolean;
    }) => {
      if (!editingLink) {
        throw new Error(
          "No media link was selected.",
        );
      }

      return updateMediaLink(
        editingLink.id,
        values,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMediaLink,
  });

  async function refreshGallery() {
    await queryClient.invalidateQueries({
      queryKey: mediaQueryKeys.all,
    });
  }

  async function updateLink(values: {
    purpose: "INTERNAL" | "MARKETING";
    caption: string | null;
    coverMedia: boolean;
  }) {
    setError(null);

    try {
      await updateMutation.mutateAsync(values);
      await refreshGallery();
      setEditingLink(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The media link could not be updated.",
        ),
      );
    }
  }

  async function removeLink(
    link: MediaLink,
  ) {
    const confirmed = window.confirm(
      "Remove this media item from the gallery? The original file will remain in the media library.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteMutation.mutateAsync(
        link.id,
      );

      await refreshGallery();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The media link could not be removed.",
        ),
      );
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
        <div>
          <h2 className="text-lg font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Private photos, videos, and documents.
          </p>
        </div>

        {canUpload && (
          <button
            type="button"
            onClick={() =>
              setUploadOpen(true)
            }
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
          >
            Upload media
          </button>
        )}
      </header>

      {error && (
        <div className="m-5 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {galleryQuery.isPending && (
        <div className="p-10 text-center text-slate-500">
          Loading media...
        </div>
      )}

      {galleryQuery.isError && (
        <div className="p-10 text-center text-red-600">
          {getApiErrorMessage(
            galleryQuery.error,
            "The media gallery could not be loaded.",
          )}
        </div>
      )}

      {galleryQuery.data?.length === 0 && (
        <div className="p-10 text-center text-slate-500">
          No media has been linked.
        </div>
      )}

      {galleryQuery.data &&
        galleryQuery.data.length > 0 && (
          <div className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {galleryQuery.data.map((link) => (
              <article
                key={link.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="relative">
                  <MediaPreview
                    mediaId={link.mediaId}
                    mediaType={link.mediaType}
                    contentType={link.contentType}
                    title={
                      link.mediaTitle ??
                      link.originalFilename
                    }
                  />

                  {link.coverMedia && (
                    <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">
                      Cover
                    </span>
                  )}

                  <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
                    {link.purpose}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold">
                    {link.mediaTitle ??
                      link.originalFilename}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {link.mediaType} ·{" "}
                    {formatFileSize(
                      link.actualSize ?? 0,
                    )}
                  </p>

                  {link.caption && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {link.caption}
                    </p>
                  )}

                  {canManage && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingLink(link);
                        }}
                        className="rounded border px-3 py-1.5 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          deleteMutation.isPending
                        }
                        onClick={() =>
                          removeLink(link)
                        }
                        className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                      >
                        Unlink
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

      {uploadOpen && (
        <MediaUploadDialog
          target={target}
          onClose={() =>
            setUploadOpen(false)
          }
          onCompleted={async () => {
            await refreshGallery();
          }}
        />
      )}

      {editingLink && (
        <MediaLinkDialog
          link={editingLink}
          submitting={updateMutation.isPending}
          errorMessage={error}
          onClose={() => {
            setEditingLink(null);
            setError(null);
          }}
          onSubmit={updateLink}
        />
      )}
    </section>
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
