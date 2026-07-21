package com.academy.platform.reporting;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReportExportResponse(
        UUID id,
        ReportExportType reportType,
        ReportExportStatus status,

        UUID studentId,
        String studentNumber,
        String studentName,

        UUID groupId,
        String groupName,

        LocalDate dateFrom,
        LocalDate dateTo,

        String filename,
        String contentType,
        Long fileSize,

        UUID requestedBy,
        OffsetDateTime requestedAt,
        OffsetDateTime processingStartedAt,
        OffsetDateTime completedAt,
        OffsetDateTime failedAt,
        OffsetDateTime expiresAt,

        String errorMessage,
        UUID sourceExportId
) {
}
