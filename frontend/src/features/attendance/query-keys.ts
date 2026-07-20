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
};
