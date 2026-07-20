package com.academy.platform.program;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProgramResponse(
        UUID id,
        String code,
        String name,
        String description,
        String category,
        Integer minimumAge,
        Integer maximumAge,
        ProgramStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
