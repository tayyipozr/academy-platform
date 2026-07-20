package com.academy.platform.evaluation;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveStudentEvaluationRequest(

        @NotNull
        UUID studentId,

        @NotNull
        UUID groupId,

        UUID sessionId,

        @NotNull
        UUID templateId,

        @NotNull
        LocalDate evaluationDate,

        @Size(max = 5000)
        String evaluatorComment,

        List<@Valid SaveEvaluationScoreRequest> scores
) {
    public SaveStudentEvaluationRequest {
        scores = scores == null
                ? List.of()
                : List.copyOf(scores);
    }
}
