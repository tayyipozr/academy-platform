package com.academy.platform.media;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MediaLinkResponse(
        UUID id,
        UUID mediaId,
        String originalFilename,
        String contentType,
        MediaType mediaType,
        MediaStatus mediaStatus,
        Long actualSize,
        String mediaTitle,
        String mediaDescription,
        MediaTargetType targetType,
        UUID targetId,
        String targetName,
        MediaPurpose purpose,
        String caption,
        boolean coverMedia,
        UUID linkedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
        ) {

}
