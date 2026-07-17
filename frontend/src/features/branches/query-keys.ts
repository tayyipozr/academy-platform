export const branchQueryKeys = {
  all: ["branches"] as const,

  list: (includeArchived: boolean) =>
    ["branches", { includeArchived }] as const,
};
