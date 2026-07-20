export const groupQueryKeys = {
  all: ["groups"] as const,

  list: (filters: object) =>
    ["groups", "list", filters] as const,

  detail: (groupId: string) =>
    ["groups", "detail", groupId] as const,

  enrollments: (
    groupId: string,
    includeHistory: boolean,
  ) =>
    [
      "groups",
      groupId,
      "enrollments",
      { includeHistory },
    ] as const,

  staffAssignments: (
    groupId: string,
    includeHistory: boolean,
  ) =>
    [
      "groups",
      groupId,
      "staff-assignments",
      { includeHistory },
    ] as const,
};
