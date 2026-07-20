export const curriculumQueryKeys = {
  all: ["curricula"] as const,

  lists: () =>
    [...curriculumQueryKeys.all, "list"] as const,

  list: (filters: {
    search: string;
    programId: string;
    includeArchived: boolean;
  }) =>
    [
      ...curriculumQueryKeys.lists(),
      filters,
    ] as const,

  detail: (curriculumId: string) =>
    [
      ...curriculumQueryKeys.all,
      "detail",
      curriculumId,
    ] as const,

  units: (curriculumId: string) =>
    [
      ...curriculumQueryKeys.all,
      curriculumId,
      "units",
    ] as const,

  outcomes: (
    curriculumId: string,
    unitId: string,
  ) =>
    [
      ...curriculumQueryKeys.all,
      curriculumId,
      "units",
      unitId,
      "outcomes",
    ] as const,
};
