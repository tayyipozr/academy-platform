package com.academy.platform.groupmanagement;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record GroupResponse(
        UUID id,
        UUID branchId,
        String branchName,
        UUID programId,
        String programCode,
        String programName,
        UUID termId,
        String termCode,
        String termName,
        LocalDate termStartDate,
        LocalDate termEndDate,
        String code,
        String name,
        String description,
        int capacity,
        Integer minimumAge,
        Integer maximumAge,
        GroupStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
