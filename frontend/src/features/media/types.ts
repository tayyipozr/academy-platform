export type MediaType =
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT";

export type MediaStatus =
  | "PENDING"
  | "AVAILABLE"
  | "FAILED"
  | "DELETED";

export type MediaPurpose =
  | "INTERNAL"
  | "MARKETING";

export type MediaTargetType =
  | "STUDENT"
  | "GROUP"
  | "SESSION"
  | "EVALUATION";

export type MediaFile = {
  id: string;
  originalFilename: string;
  contentType: string;
  mediaType: MediaType;
  status: MediaStatus;
  expectedSize: number;
  actualSize: number | null;
  title: string | null;
  description: string | null;
  uploadedBy: string;
  uploadCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaUploadRequest = {
  filename: string;
  contentType: string;
  size: number;
  title: string | null;
  description: string | null;
};

export type MediaUploadResponse = {
  mediaId: string;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  expiresAt: string;
};

export type MediaDownloadResponse = {
  downloadUrl: string;
  expiresAt: string;
};

export type MediaLink = {
  id: string;

  mediaId: string;
  originalFilename: string;
  contentType: string;
  mediaType: MediaType;
  mediaStatus: MediaStatus;
  actualSize: number | null;
  mediaTitle: string | null;
  mediaDescription: string | null;

  targetType: MediaTargetType;
  targetId: string;
  targetName: string;

  purpose: MediaPurpose;
  caption: string | null;
  coverMedia: boolean;

  linkedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaLinkRequest = {
  targetType: MediaTargetType;
  targetId: string;
  purpose: MediaPurpose;
  caption: string | null;
  coverMedia: boolean;
};

export type UpdateMediaLinkRequest = {
  purpose: MediaPurpose;
  caption: string | null;
  coverMedia: boolean;
};

export type MediaTarget = {
  type: MediaTargetType;
  id: string;
};
