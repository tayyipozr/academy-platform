export const termQueryKeys = {
  all: ["terms"] as const,

  list: (
    search: string,
    includeArchived: boolean,
  ) =>
    [
      "terms",
      {
        search,
        includeArchived,
      },
    ] as const,
};
