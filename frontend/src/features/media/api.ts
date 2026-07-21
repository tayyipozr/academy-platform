import { apiRequest } from "@/lib/api/api-client";

import type {
  CreateMediaLinkRequest,
  CreateMediaUploadRequest,
  MediaDownloadResponse,
  MediaFile,
  MediaLink,
  MediaStatus,
  MediaTargetType,
  MediaType,
  MediaUploadResponse,
  UpdateMediaLinkRequest,
} from "./types";

export function getMediaFiles(
  filters: {
    type?: MediaType | "";
    status?: MediaStatus | "";
  } = {},
): Promise<MediaFile[]> {
  const query = new URLSearchParams();

  if (filters.type) {
    query.set("type", filters.type);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  return apiRequest<MediaFile[]>(
    `/media?${query.toString()}`,
  );
}

export function initializeMediaUpload(
  request: CreateMediaUploadRequest,
): Promise<MediaUploadResponse> {
  return apiRequest<MediaUploadResponse>(
    "/media/uploads",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function completeMediaUpload(
  mediaId: string,
): Promise<MediaFile> {
  return apiRequest<MediaFile>(
    `/media/${mediaId}/complete`,
    {
      method: "POST",
    },
  );
}

export function getMediaDownloadUrl(
  mediaId: string,
): Promise<MediaDownloadResponse> {
  return apiRequest<MediaDownloadResponse>(
    `/media/${mediaId}/download`,
  );
}

export function deleteMedia(
  mediaId: string,
): Promise<void> {
  return apiRequest<void>(`/media/${mediaId}`, {
    method: "DELETE",
  });
}

export function getTargetMedia(
  targetType: MediaTargetType,
  targetId: string,
): Promise<MediaLink[]> {
  return apiRequest<MediaLink[]>(
    `/media/targets/${targetType}/${targetId}`,
  );
}

export function createMediaLink(
  mediaId: string,
  request: CreateMediaLinkRequest,
): Promise<MediaLink> {
  return apiRequest<MediaLink>(
    `/media/${mediaId}/links`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export function updateMediaLink(
  linkId: string,
  request: UpdateMediaLinkRequest,
): Promise<MediaLink> {
  return apiRequest<MediaLink>(
    `/media/links/${linkId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );
}

export function deleteMediaLink(
  linkId: string,
): Promise<void> {
  return apiRequest<void>(
    `/media/links/${linkId}`,
    {
      method: "DELETE",
    },
  );
}

export function getGuardianStudentMedia(
  studentId: string,
): Promise<MediaLink[]> {
  return apiRequest<MediaLink[]>(
    `/guardian-media/students/${studentId}`,
  );
}
