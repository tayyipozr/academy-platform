export const guardianQueryKeys = {
  all: ["guardians"] as const,

  list: (
    search: string,
    includeArchived: boolean,
  ) =>
    [
      "guardians",
      {
        search,
        includeArchived,
      },
    ] as const,
};
