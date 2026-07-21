import type {
  MediaTargetType,
} from "./types";

export const mediaQueryKeys = {
  all: ["media"] as const,

  library: (filters: object) =>
    [
      ...mediaQueryKeys.all,
      "library",
      filters,
    ] as const,

  download: (mediaId: string) =>
    [
      ...mediaQueryKeys.all,
      "download",
      mediaId,
    ] as const,

  target: (
    targetType: MediaTargetType,
    targetId: string,
  ) =>
    [
      ...mediaQueryKeys.all,
      "target",
      targetType,
      targetId,
    ] as const,

  guardianStudent: (studentId: string) =>
    [
      ...mediaQueryKeys.all,
      "guardian-student",
      studentId,
    ] as const,
};
