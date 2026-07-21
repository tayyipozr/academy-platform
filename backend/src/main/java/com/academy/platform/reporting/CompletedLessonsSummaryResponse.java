package com.academy.platform.reporting;

public record CompletedLessonsSummaryResponse(
        int completedSessionCount,
        int attendedCompletedSessionCount,
        int missedCompletedSessionCount,
        int sessionsWithoutAttendanceCount
) {
}
