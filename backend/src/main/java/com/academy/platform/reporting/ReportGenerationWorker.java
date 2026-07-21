package com.academy.platform.reporting;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ReportGenerationWorker {

    private static final String PDF_CONTENT_TYPE =
            "application/pdf";

    private final JdbcTemplate jdbcTemplate;
    private final StudentProgressReportService
            progressReportService;

    private final StudentProgressPdfRenderer
            pdfRenderer;

    private final ReportStorage reportStorage;
    private final ReportProperties properties;

    public ReportGenerationWorker(
            JdbcTemplate jdbcTemplate,
            StudentProgressReportService
                    progressReportService,
            StudentProgressPdfRenderer pdfRenderer,
            ReportStorage reportStorage,
            ReportProperties properties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.progressReportService =
                progressReportService;
        this.pdfRenderer = pdfRenderer;
        this.reportStorage = reportStorage;
        this.properties = properties;
    }

    @Async("reportTaskExecutor")
    public void generate(
            UUID exportId,
            AuthenticatedUser actor
    ) {
        try {
            ReportExportRecord export =
                    claimExport(exportId);

            if (export == null) {
                return;
            }

            StudentProgressReportResponse report =
                    progressReportService
                            .generateStudentProgress(
                                    actor,
                                    export.studentId(),
                                    export.groupId(),
                                    export.dateFrom(),
                                    export.dateTo()
                            );

            byte[] pdf = pdfRenderer.render(report);

            String filename = createFilename(
                    report,
                    export.id()
            );

            String storageKey =
                    export.organizationId()
                            + "/reports/"
                            + export.id()
                            + "/"
                            + filename;

            reportStorage.store(
                    storageKey,
                    pdf,
                    PDF_CONTENT_TYPE
            );

            OffsetDateTime completedAt =
                    OffsetDateTime.now(
                            ZoneOffset.UTC
                    );

            OffsetDateTime expiresAt =
                    completedAt.plus(
                            properties.retention()
                    );

            jdbcTemplate.update(
                    """
                    UPDATE report_exports
                    SET
                        status = 'COMPLETED',
                        storage_bucket = ?,
                        storage_key = ?,
                        filename = ?,
                        content_type = ?,
                        file_size = ?,
                        completed_at = ?,
                        expires_at = ?,
                        error_message = NULL,
                        updated_at = ?,
                        version = version + 1
                    WHERE id = ?
                      AND status = 'PROCESSING'
                    """,
                    reportStorage.bucket(),
                    storageKey,
                    filename,
                    PDF_CONTENT_TYPE,
                    pdf.length,
                    completedAt,
                    expiresAt,
                    completedAt,
                    exportId
            );
        } catch (Exception exception) {
            markFailed(
                    exportId,
                    safeErrorMessage(exception)
            );
        }
    }

    private ReportExportRecord claimExport(
            UUID exportId
    ) {
        OffsetDateTime startedAt =
                OffsetDateTime.now(ZoneOffset.UTC);

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE report_exports
                SET
                    status = 'PROCESSING',
                    processing_started_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND status = 'PENDING'
                """,
                startedAt,
                startedAt,
                exportId
        );

        if (updatedRows == 0) {
            return null;
        }

        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    organization_id,
                    report_type,
                    status,
                    student_id,
                    group_id,
                    date_from,
                    date_to,
                    storage_bucket,
                    storage_key,
                    filename,
                    content_type,
                    file_size,
                    requested_by,
                    expires_at,
                    source_export_id
                FROM report_exports
                WHERE id = ?
                """,
                (resultSet, rowNumber) ->
                        new ReportExportRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "organization_id",
                                        UUID.class
                                ),
                                ReportExportType.valueOf(
                                        resultSet.getString(
                                                "report_type"
                                        )
                                ),
                                ReportExportStatus.valueOf(
                                        resultSet.getString(
                                                "status"
                                        )
                                ),
                                resultSet.getObject(
                                        "student_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "group_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "date_from",
                                        java.time.LocalDate.class
                                ),
                                resultSet.getObject(
                                        "date_to",
                                        java.time.LocalDate.class
                                ),
                                resultSet.getString(
                                        "storage_bucket"
                                ),
                                resultSet.getString(
                                        "storage_key"
                                ),
                                resultSet.getString(
                                        "filename"
                                ),
                                resultSet.getString(
                                        "content_type"
                                ),
                                resultSet.getObject(
                                        "file_size",
                                        Long.class
                                ),
                                resultSet.getObject(
                                        "requested_by",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "expires_at",
                                        OffsetDateTime.class
                                ),
                                resultSet.getObject(
                                        "source_export_id",
                                        UUID.class
                                )
                        ),
                exportId
        ).stream().findFirst().orElse(null);
    }

    private void markFailed(
            UUID exportId,
            String errorMessage
    ) {
        OffsetDateTime failedAt =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE report_exports
                SET
                    status = 'FAILED',
                    failed_at = ?,
                    error_message = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND status IN (
                      'PENDING',
                      'PROCESSING'
                  )
                """,
                failedAt,
                errorMessage,
                failedAt,
                exportId
        );
    }

    private String createFilename(
            StudentProgressReportResponse report,
            UUID exportId
    ) {
        String studentNumber =
                sanitizeFilenamePart(
                        report.studentNumber()
                );

        return "student-progress-"
                + studentNumber
                + "-"
                + exportId
                + ".pdf";
    }

    private String sanitizeFilenamePart(
            String value
    ) {
        return value
                .replaceAll(
                        "[^A-Za-z0-9._-]",
                        "_"
                )
                .toLowerCase(
                        java.util.Locale.ROOT
                );
    }

    private String safeErrorMessage(
            Exception exception
    ) {
        String message = exception.getMessage();

        if (message == null || message.isBlank()) {
            message =
                    exception.getClass()
                            .getSimpleName();
        }

        return message.length() > 1900
                ? message.substring(0, 1900)
                : message;
    }
}
