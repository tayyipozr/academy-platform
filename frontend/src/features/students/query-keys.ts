export const studentQueryKeys = {
  all: ["students"] as const,

  lists: () =>
    [...studentQueryKeys.all, "list"] as const,

  list: (
    search: string,
    includeArchived: boolean,
  ) =>
    [
      ...studentQueryKeys.lists(),
      {
        search,
        includeArchived,
      },
    ] as const,

  detail: (studentId: string) =>
    [
      ...studentQueryKeys.all,
      "detail",
      studentId,
    ] as const,

  guardians: (studentId: string) =>
    [
      ...studentQueryKeys.all,
      "guardians",
      studentId,
    ] as const,
};
