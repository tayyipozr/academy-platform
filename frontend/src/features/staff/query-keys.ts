export const staffQueryKeys = {
  all: ["staff"] as const,

  list: (
    search: string,
    includeArchived: boolean,
  ) =>
    [
      "staff",
      {
        search,
        includeArchived,
      },
    ] as const,
};
