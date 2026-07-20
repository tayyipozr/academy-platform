package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record GroupPerformanceSummaryResponse(
        UUID groupId,
        String groupCode,
        String groupName,
        UUID programId,
        String programName,
        UUID termId,
        String termName,

        LocalDate dateFrom,
        LocalDate dateTo,

        int studentCount,
        int publishedEvaluationCount,
        BigDecimal averageNormalizedScore,

        int passingEvaluationCount,
        int passingRateDenominator,
        BigDecimal passingRate,

        List<GroupStudentPerformanceResponse> students
) {
    public GroupPerformanceSummaryResponse {
        students = List.copyOf(students);
    }
}
