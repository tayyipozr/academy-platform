package com.academy.platform.media;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record MediaUploadResponse(
        UUID mediaId,
        String uploadUrl,
        String method,
        Map<String, String> requiredHeaders,
        OffsetDateTime expiresAt
) {
    public MediaUploadResponse {
        requiredHeaders =
                Map.copyOf(requiredHeaders);
    }
}
