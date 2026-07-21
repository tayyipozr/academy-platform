package com.academy.platform.reporting;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.academy.platform.attendance.StudentAttendanceSummaryResponse;
import com.academy.platform.evaluation.StudentDevelopmentSummaryResponse;

public record StudentProgressReportResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,

        UUID groupId,
        String groupCode,
        String groupName,

        LocalDate dateFrom,
        LocalDate dateTo,

        StudentAttendanceSummaryResponse attendance,

        StudentDevelopmentSummaryResponse development,

        CompletedLessonsSummaryResponse lessons,

        OffsetDateTime generatedAt
) {
}
