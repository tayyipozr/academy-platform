"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getMediaDownloadUrl,
} from "./api";

import {
  mediaQueryKeys,
} from "./query-keys";

import type {
  MediaType,
} from "./types";
import { useLocalization } from "../localization/use-localization";

export function MediaPreview({
  mediaId,
  mediaType,
  contentType,
  title,
}: {
  mediaId: string;
  mediaType: MediaType;
  contentType: string;
  title: string;
}) {
  const downloadQuery = useQuery({
    queryKey:
      mediaQueryKeys.download(mediaId),

    queryFn: () =>
      getMediaDownloadUrl(mediaId),

    staleTime: 4 * 60 * 1000,
    retry: false,
  });

  const {
    dictionary
  } = useLocalization();

  const t = dictionary.pages.media;
  const common = dictionary.common;

  if (downloadQuery.isPending) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading preview...
      </div>
    );
  }

  if (
    downloadQuery.isError ||
    !downloadQuery.data
  ) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-100 text-sm text-red-600">
        {t.previewUnavailable}
      </div>
    );
  }

  const url =
    downloadQuery.data.downloadUrl;

  if (mediaType === "IMAGE") {
    return (
      <div
        role="img"
        aria-label={title}
        className="aspect-video bg-cover bg-center"
        style={{
          backgroundImage: `url("${url}")`,
        }}
      />
    );
  }

  if (mediaType === "VIDEO") {
    return (
      <video
        controls
        preload="metadata"
        className="aspect-video w-full bg-black"
      >
        <source
          src={url}
          type={contentType}
        />
      </video>
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-slate-100">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        {t.openDocument}
      </a>
    </div>
  );
}
