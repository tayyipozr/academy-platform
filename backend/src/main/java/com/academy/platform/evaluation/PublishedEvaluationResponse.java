package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PublishedEvaluationResponse(
        UUID id,

        UUID studentId,
        String studentNumber,
        String studentFirstName,
        String studentLastName,

        UUID groupId,
        String groupCode,
        String groupName,

        UUID templateId,
        String templateName,
        String templateVersion,

        LocalDate evaluationDate,

        BigDecimal minimumScore,
        BigDecimal maximumScore,
        BigDecimal passingScore,
        BigDecimal overallScore,

        BigDecimal normalizedScore,
        Boolean passed,

        String evaluatorName,
        String evaluatorComment,

        OffsetDateTime publishedAt,

        List<PublishedCriterionScoreResponse> scores
) {
    public PublishedEvaluationResponse {
        scores = List.copyOf(scores);
    }
}
