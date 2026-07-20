package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.util.UUID;

public record GroupStudentPerformanceResponse(
        UUID studentId,
        String studentNumber,
        String firstName,
        String lastName,
        int publishedEvaluationCount,
        BigDecimal averageNormalizedScore,
        BigDecimal latestNormalizedScore,
        BigDecimal scoreTrend,
        DevelopmentStatus developmentStatus
) {
}
