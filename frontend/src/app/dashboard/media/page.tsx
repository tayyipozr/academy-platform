"use client";

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentUser } from "@/features/auth/api";

import {
  deleteMedia,
  getMediaFiles,
} from "@/features/media/api";

import { MediaPreview } from "@/features/media/media-preview";
import { MediaUploadDialog } from "@/features/media/media-upload-dialog";
import { mediaQueryKeys } from "@/features/media/query-keys";

import type {
  MediaStatus,
  MediaType,
} from "@/features/media/types";

import { getApiErrorMessage } from "@/lib/api/error-message";
import { hasPermission } from "@/lib/permissions";
import { useLocalization } from "@/features/localization/use-localization";

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();

  const [type, setType] =
    useState<MediaType | "">("");

  const [status, setStatus] =
    useState<MediaStatus | "">("");

  const [uploadOpen, setUploadOpen] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const currentUser = currentUserQuery.data;

  const canRead = hasPermission(
    currentUser,
    "media.read",
  );

  const canUpload = hasPermission(
    currentUser,
    "media.upload",
  );

  const canDelete = hasPermission(
    currentUser,
    "media.delete",
  );

  const filters = { type, status };

  const mediaQuery = useQuery({
    queryKey: mediaQueryKeys.library(filters),
    queryFn: () => getMediaFiles(filters),
    enabled:
      currentUserQuery.isSuccess && canRead,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
  });

  const {
    dictionary,
    mediaLabel,
    statusLabel
  } = useLocalization();

  const t = dictionary.pages.media;
  const common = dictionary.common;

  async function refreshMedia() {
    await queryClient.invalidateQueries({
      queryKey: mediaQueryKeys.all,
    });
  }

  async function removeMedia(mediaId: string) {
    const confirmed = window.confirm(
      "Delete this media file permanently?",
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteMutation.mutateAsync(mediaId);
      await refreshMedia();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The media file could not be deleted.",
        ),
      );
    }
  }

  if (currentUserQuery.isPending) {
    return (
      <main className="p-8">
        Loading media library...
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader user={currentUser} />

      <main className="mx-auto max-w-7xl p-6">
        {!canRead ? (
          <div className="rounded-xl bg-red-50 p-5 text-red-700">
            {common.messages.permissionDenied}
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {t.title}
                </h1>

                <p className="mt-1 text-slate-600">
                  {t.description}
                </p>
              </div>

              {canUpload && (
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  {t.upload}
                </button>
              )}
            </header>

            <section className="mt-6 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2">
              <div>
                <label
                  htmlFor="mediaType"
                  className="block text-sm font-medium"
                >
                  {t.mediaType}
                </label>

                <select
                  id="mediaType"
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as
                      | MediaType
                      | "",
                    )
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">{common.filters.allTypes}</option>
                  <option value="IMAGE">{common.fields.images}</option>
                  <option value="VIDEO">{common.fields.videos}</option>
                  <option value="DOCUMENT">
                    {common.fields.documents}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="mediaStatus"
                  className="block text-sm font-medium"
                >
                  {t.uploadStatus}
                </label>

                <select
                  id="mediaStatus"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as
                      | MediaStatus
                      | "",
                    )
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">{common.filters.allStatuses}</option>
                  <option value="PENDING">{common.statuses.PENDING}</option>
                  <option value="AVAILABLE">{common.statuses.AVAILABLE}</option>
                  <option value="FAILED">{common.statuses.FAILED}</option>
                </select>
              </div>
            </section>

            {error && (
              <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            {mediaQuery.isPending && (
              <div className="mt-6 rounded-xl bg-white p-10 text-center">
                {t.loading}
              </div>
            )}

            {mediaQuery.isError && (
              <div className="mt-6 rounded-xl bg-red-50 p-5 text-red-700">
                {getApiErrorMessage(
                  mediaQuery.error,
                  common.messages.operationFailed,
                )}
              </div>
            )}

            {mediaQuery.data?.length === 0 && (
              <div className="mt-6 rounded-xl bg-white p-10 text-center text-slate-500">
                {t.empty}
              </div>
            )}

            {mediaQuery.data &&
              mediaQuery.data.length > 0 && (
                <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {mediaQuery.data.map((media) => (
                    <article
                      key={media.id}
                      className="overflow-hidden rounded-xl bg-white shadow-sm"
                    >
                      {media.status === "AVAILABLE" ? (
                        <MediaPreview
                          mediaId={media.id}
                          mediaType={media.mediaType}
                          contentType={media.contentType}
                          title={
                            media.title ??
                            media.originalFilename
                          }
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-600">
                          {media.status}
                        </div>
                      )}

                      <div className="p-4">
                        <h2 className="font-semibold">
                          {media.title ??
                            media.originalFilename}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {mediaLabel(media.mediaType)} ·{" "}
                          {statusLabel(media.status)}
                        </p>

                        {media.description && (
                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                            {media.description}
                          </p>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            disabled={
                              deleteMutation.isPending
                            }
                            onClick={() =>
                              removeMedia(media.id)
                            }
                            className="mt-4 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
                          >
                            {common.actions.delete}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}
          </>
        )}
      </main>

      {uploadOpen && (
        <MediaUploadDialog
          onClose={() => setUploadOpen(false)}
          onCompleted={async () => {
            await refreshMedia();
          }}
        />
      )}
    </div>
  );
}
