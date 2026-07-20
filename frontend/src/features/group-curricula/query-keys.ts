export const groupCurriculumQueryKeys = {
  all: ["group-curricula"] as const,

  assignments: (
    groupId: string,
    includeHistory: boolean,
  ) =>
    [
      ...groupCurriculumQueryKeys.all,
      groupId,
      "assignments",
      { includeHistory },
    ] as const,

  progress: (
    groupId: string,
    assignmentId: string,
  ) =>
    [
      ...groupCurriculumQueryKeys.all,
      groupId,
      "assignments",
      assignmentId,
      "progress",
    ] as const,
};
