package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EvaluationTrendPointResponse(
        UUID evaluationId,
        LocalDate evaluationDate,
        String templateName,
        String templateVersion,
        BigDecimal overallScore,
        BigDecimal normalizedScore
) {
}
