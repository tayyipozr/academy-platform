package com.academy.platform.evaluation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StudentEvaluationSummaryResponse(
        UUID id,
        UUID studentId,
        String studentNumber,
        String studentFirstName,
        String studentLastName,
        UUID groupId,
        String groupCode,
        String groupName,
        UUID sessionId,
        String sessionTitle,
        UUID templateId,
        String templateName,
        String templateVersion,
        LocalDate evaluationDate,
        BigDecimal overallScore,
        StudentEvaluationStatus status,
        String evaluatorName,
        OffsetDateTime submittedAt,
        OffsetDateTime publishedAt
) {
}
