package com.academy.platform.media;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MediaResponse(
        UUID id,
        String originalFilename,
        String contentType,
        MediaType mediaType,
        MediaStatus status,
        long expectedSize,
        Long actualSize,
        String title,
        String description,
        UUID uploadedBy,
        OffsetDateTime uploadCompletedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
