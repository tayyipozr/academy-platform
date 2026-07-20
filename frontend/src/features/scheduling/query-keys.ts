export const schedulingQueryKeys = {
  all: ["scheduling"] as const,

  rules: (
    groupId: string,
    includeArchived: boolean,
  ) =>
    [
      ...schedulingQueryKeys.all,
      groupId,
      "rules",
      { includeArchived },
    ] as const,

  sessions: (filters: {
    groupId?: string;
    staffId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    [
      ...schedulingQueryKeys.all,
      "sessions",
      filters,
    ] as const,
};
