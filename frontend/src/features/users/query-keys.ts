export const userQueryKeys = {
  all: ["users"] as const,

  lists: () =>
    [...userQueryKeys.all, "list"] as const,

  list: (
    search: string,
    page: number,
    size: number,
  ) =>
    [
      ...userQueryKeys.lists(),
      { search, page, size },
    ] as const,

  roles: ["roles"] as const,
};
