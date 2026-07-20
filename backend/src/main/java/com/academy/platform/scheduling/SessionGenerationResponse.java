package com.academy.platform.scheduling;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SessionGenerationResponse(
        UUID scheduleRuleId,
        LocalDate dateFrom,
        LocalDate dateTo,
        int matchedDateCount,
        int generatedSessionCount,
        int skippedSessionCount,
        List<SessionResponse> generatedSessions
) {
    public SessionGenerationResponse {
        generatedSessions =
                List.copyOf(generatedSessions);
    }
}
