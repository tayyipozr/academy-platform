export const reportingQueryKeys = {
  all: ["reporting"] as const,

  dashboard: () =>
    [
      ...reportingQueryKeys.all,
      "dashboard",
    ] as const,

  studentProgress: (
    studentId: string,
    filters: object,
  ) =>
    [
      ...reportingQueryKeys.all,
      "student-progress",
      studentId,
      filters,
    ] as const,

  exports: (filters: object) =>
    [
      ...reportingQueryKeys.all,
      "exports",
      filters,
    ] as const,

  exportDetail: (exportId: string) =>
    [
      ...reportingQueryKeys.all,
      "exports",
      exportId,
    ] as const,
};
