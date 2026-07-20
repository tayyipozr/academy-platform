package com.academy.platform.media;

import java.time.OffsetDateTime;

public record MediaDownloadResponse(
        String downloadUrl,
        OffsetDateTime expiresAt
) {
}
