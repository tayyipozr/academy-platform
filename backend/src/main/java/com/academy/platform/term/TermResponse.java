package com.academy.platform.term;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TermResponse(
        UUID id,
        String code,
        String name,
        LocalDate startDate,
        LocalDate endDate,
        TermStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
