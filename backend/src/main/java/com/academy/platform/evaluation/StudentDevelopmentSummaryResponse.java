package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record StudentDevelopmentSummaryResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,

        UUID groupId,
        String groupCode,
        String groupName,

        LocalDate dateFrom,
        LocalDate dateTo,

        int publishedEvaluationCount,
        BigDecimal averageNormalizedScore,
        BigDecimal latestNormalizedScore,
        BigDecimal scoreTrend,

        int passingEvaluationCount,
        int passingRateDenominator,
        BigDecimal passingRate,

        BigDecimal attendancePercentage,
        BigDecimal groupCurriculumCompletionPercentage,

        DevelopmentStatus developmentStatus,

        List<CriterionAverageResponse> criterionAverages,
        List<EvaluationTrendPointResponse> trend
) {
    public StudentDevelopmentSummaryResponse {
        criterionAverages =
                List.copyOf(criterionAverages);

        trend = List.copyOf(trend);
    }
}
