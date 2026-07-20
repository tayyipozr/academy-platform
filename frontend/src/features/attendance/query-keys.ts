export const attendanceQueryKeys = {
  all: ["attendance"] as const,

  session: (sessionId: string) =>
    [
      ...attendanceQueryKeys.all,
      "session",
      sessionId,
    ] as const,

  corrections: (sessionId: string) =>
    [
      ...attendanceQueryKeys.all,
      "session",
      sessionId,
      "corrections",
    ] as const,

  studentHistory: (
    studentId: string,
    filters: object,
  ) =>
    [
      ...attendanceQueryKeys.all,
      "student",
      studentId,
      "history",
      filters,
    ] as const,

  groupSummary: (
    groupId: string,
    filters: object,
  ) =>
    [
      ...attendanceQueryKeys.all,
      "group",
      groupId,
      "summary",
      filters,
    ] as const,

  guardianStudents: () =>
    [
      ...attendanceQueryKeys.all,
      "guardian",
      "students",
    ] as const,
};

