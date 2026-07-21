package com.academy.platform.reporting;

import java.time.Duration;

public interface ReportStorage {

    void store(
            String storageKey,
            byte[] content,
            String contentType
    );

    SignedReportDownload createDownloadUrl(
            String storageKey,
            String filename,
            Duration duration
    );

    void delete(String storageKey);

    String bucket();

    record SignedReportDownload(
            String url,
            java.time.OffsetDateTime expiresAt
    ) {
    }
}
