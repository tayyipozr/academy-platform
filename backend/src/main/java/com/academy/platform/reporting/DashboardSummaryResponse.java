package com.academy.platform.reporting;

import java.time.OffsetDateTime;
import java.util.List;

public record DashboardSummaryResponse(
        String dashboardType,

        long activeStudentCount,
        long activeGroupCount,
        long activeStaffCount,

        long upcomingSessionCount,
        long sessionsMissingAttendanceCount,

        long draftEvaluationCount,
        long submittedEvaluationCount,
        long publishedEvaluationCount,

        long activeCurriculumCount,

        OffsetDateTime generatedAt,

        List<UpcomingSessionSummaryResponse>
                upcomingSessions
) {
    public DashboardSummaryResponse {
        upcomingSessions =
                List.copyOf(upcomingSessions);
    }
}
