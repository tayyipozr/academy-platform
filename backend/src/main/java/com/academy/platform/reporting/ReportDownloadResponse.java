package com.academy.platform.reporting;

import java.time.OffsetDateTime;

public record ReportDownloadResponse(
        String downloadUrl,
        String filename,
        String contentType,
        OffsetDateTime expiresAt
) {
}
