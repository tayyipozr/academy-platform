export const evaluationQueryKeys = {
  all: ["evaluations"] as const,

  templates: () =>
    [
      ...evaluationQueryKeys.all,
      "templates",
    ] as const,

  templateList: (filters: {
    search: string;
    programId: string;
    includeArchived: boolean;
  }) =>
    [
      ...evaluationQueryKeys.templates(),
      "list",
      filters,
    ] as const,

  templateDetail: (templateId: string) =>
    [
      ...evaluationQueryKeys.templates(),
      "detail",
      templateId,
    ] as const,

  criteria: (templateId: string) =>
    [
      ...evaluationQueryKeys.templates(),
      templateId,
      "criteria",
    ] as const,

  studentEvaluations: (filters: object) =>
    [
      ...evaluationQueryKeys.all,
      "student-evaluations",
      filters,
    ] as const,

  evaluationDetail: (evaluationId: string) =>
    [
      ...evaluationQueryKeys.all,
      "detail",
      evaluationId,
    ] as const,

  studentDevelopment: (
    studentId: string,
    filters: object,
  ) =>
    [
      ...evaluationQueryKeys.all,
      "development",
      studentId,
      filters,
    ] as const,

  groupPerformance: (
    groupId: string,
    filters: object,
  ) =>
    [
      ...evaluationQueryKeys.all,
      "group-performance",
      groupId,
      filters,
    ] as const,
};
