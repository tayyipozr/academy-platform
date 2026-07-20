export const programQueryKeys = {
  all: ["programs"] as const,

  list: (
    search: string,
    includeArchived: boolean,
  ) =>
    [
      "programs",
      {
        search,
        includeArchived,
      },
    ] as const,
};
