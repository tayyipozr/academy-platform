package com.academy.platform.reporting;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

record ReportExportRecord(
        UUID id,
        UUID organizationId,
        ReportExportType reportType,
        ReportExportStatus status,
        UUID studentId,
        UUID groupId,
        LocalDate dateFrom,
        LocalDate dateTo,
        String storageBucket,
        String storageKey,
        String filename,
        String contentType,
        Long fileSize,
        UUID requestedBy,
        OffsetDateTime expiresAt,
        UUID sourceExportId
) {
}
