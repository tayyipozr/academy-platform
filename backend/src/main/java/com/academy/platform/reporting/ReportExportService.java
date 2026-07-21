package com.academy.platform.reporting;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReportExportService {

    private final JdbcTemplate jdbcTemplate;

    private final StudentProgressReportService
            progressReportService;

    private final ReportGenerationWorker worker;
    private final ReportStorage reportStorage;
    private final ReportProperties properties;
    private final AuditService auditService;

    public ReportExportService(
            JdbcTemplate jdbcTemplate,
            StudentProgressReportService
                    progressReportService,
            ReportGenerationWorker worker,
            ReportStorage reportStorage,
            ReportProperties properties,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.progressReportService =
                progressReportService;
        this.worker = worker;
        this.reportStorage = reportStorage;
        this.properties = properties;
        this.auditService = auditService;
    }

    public ReportExportResponse requestStudentProgress(
            AuthenticatedUser actor,
            CreateStudentProgressExportRequest request
    ) {
        validateDateRange(
                request.dateFrom(),
                request.dateTo()
        );

        /*
         * Validate authorization before creating the async
         * export job. This verifies instructor assignment or
         * guardian/student linkage.
         */
        progressReportService.generateStudentProgress(
                actor,
                request.studentId(),
                request.groupId(),
                request.dateFrom(),
                request.dateTo()
        );

        UUID exportId = createExport(
                actor,
                request,
                null
        );

        auditService.record(
                actor,
                "REPORT_EXPORT_REQUESTED",
                "REPORT_EXPORT",
                exportId,
                "Student progress PDF requested."
        );

        worker.generate(exportId, actor);

        return findExport(actor, exportId);
    }

    public ReportExportResponse regenerate(
            AuthenticatedUser actor,
            UUID exportId
    ) {
        ExportRecord source = findAuthorizedRecord(
                actor,
                exportId
        );

        CreateStudentProgressExportRequest request =
                new CreateStudentProgressExportRequest(
                        source.studentId(),
                        source.groupId(),
                        source.dateFrom(),
                        source.dateTo()
                );

        progressReportService.generateStudentProgress(
                actor,
                request.studentId(),
                request.groupId(),
                request.dateFrom(),
                request.dateTo()
        );

        UUID newExportId = createExport(
                actor,
                request,
                exportId
        );

        auditService.record(
                actor,
                "REPORT_EXPORT_REGENERATED",
                "REPORT_EXPORT",
                newExportId,
                "Report regenerated from export "
                        + exportId
        );

        worker.generate(newExportId, actor);

        return findExport(actor, newExportId);
    }

    public ReportExportResponse findExport(
            AuthenticatedUser actor,
            UUID exportId
    ) {
        expireIfNecessary(actor, exportId);

        return mapResponse(
                findAuthorizedRecord(
                        actor,
                        exportId
                )
        );
    }

    public List<ReportExportResponse> findExports(
            AuthenticatedUser actor,
            UUID studentId,
            ReportExportStatus status
    ) {
        boolean administrator =
                isAdministrator(actor);

        return jdbcTemplate.query(
                """
                SELECT
                    re.id,
                    re.report_type,
                    re.status,

                    re.student_id,
                    s.student_number,

                    CONCAT(
                        s.first_name,
                        ' ',
                        s.last_name
                    ) AS student_name,

                    re.group_id,
                    ag.name AS group_name,

                    re.date_from,
                    re.date_to,

                    re.filename,
                    re.content_type,
                    re.file_size,

                    re.requested_by,
                    re.requested_at,
                    re.processing_started_at,
                    re.completed_at,
                    re.failed_at,
                    re.expires_at,

                    re.error_message,
                    re.source_export_id,

                    re.storage_key

                FROM report_exports re

                LEFT JOIN students s
                    ON s.id = re.student_id
                   AND s.organization_id =
                       re.organization_id

                LEFT JOIN academy_groups ag
                    ON ag.id = re.group_id
                   AND ag.organization_id =
                       re.organization_id

                WHERE re.organization_id = ?

                  AND (
                      ? = TRUE
                      OR re.requested_by = ?
                  )

                  AND (
                      ?::UUID IS NULL
                      OR re.student_id = ?::UUID
                  )

                  AND (
                      ?::VARCHAR IS NULL
                      OR re.status = ?::VARCHAR
                  )

                ORDER BY re.requested_at DESC
                """,
                (resultSet, rowNumber) ->
                        mapExportRecord(resultSet),
                actor.organizationId(),
                administrator,
                actor.userId(),
                studentId,
                studentId,
                status == null ? null : status.name(),
                status == null ? null : status.name()
        ).stream()
        .map(this::expireRecordIfNecessary)
        .map(this::mapResponse)
        .toList();
    }

    public ReportDownloadResponse createDownload(
            AuthenticatedUser actor,
            UUID exportId
    ) {
        ExportRecord export =
                findAuthorizedRecord(
                        actor,
                        exportId
                );

        if (export.status()
                != ReportExportStatus.COMPLETED) {
            throw new BusinessRuleException(
                    "The report is not ready for download."
            );
        }

        if (
                export.expiresAt() == null
                || !export.expiresAt().isAfter(
                        OffsetDateTime.now(
                                ZoneOffset.UTC
                        )
                )
        ) {
            markExpired(export);

            throw new BusinessRuleException(
                    "The report has expired. Generate it again."
            );
        }

        ReportStorage.SignedReportDownload
                signedDownload =
                reportStorage.createDownloadUrl(
                        export.storageKey(),
                        export.filename(),
                        properties
                                .downloadUrlDuration()
                );

        auditService.record(
                actor,
                "REPORT_EXPORT_DOWNLOADED",
                "REPORT_EXPORT",
                exportId,
                "Signed report download URL generated."
        );

        return new ReportDownloadResponse(
                signedDownload.url(),
                export.filename(),
                export.contentType(),
                signedDownload.expiresAt()
        );
    }

    private UUID createExport(
            AuthenticatedUser actor,
            CreateStudentProgressExportRequest request,
            UUID sourceExportId
    ) {
        UUID exportId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO report_exports
                (
                    id,
                    organization_id,
                    report_type,
                    status,
                    student_id,
                    group_id,
                    date_from,
                    date_to,
                    requested_by,
                    requested_at,
                    source_export_id,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    'STUDENT_PROGRESS_PDF',
                    'PENDING',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                exportId,
                actor.organizationId(),
                request.studentId(),
                request.groupId(),
                request.dateFrom(),
                request.dateTo(),
                actor.userId(),
                now,
                sourceExportId,
                now,
                now
        );

        return exportId;
    }

    private ExportRecord findAuthorizedRecord(
            AuthenticatedUser actor,
            UUID exportId
    ) {
        boolean administrator =
                isAdministrator(actor);

        return jdbcTemplate.query(
                """
                SELECT
                    re.id,
                    re.report_type,
                    re.status,

                    re.student_id,
                    s.student_number,

                    CONCAT(
                        s.first_name,
                        ' ',
                        s.last_name
                    ) AS student_name,

                    re.group_id,
                    ag.name AS group_name,

                    re.date_from,
                    re.date_to,

                    re.filename,
                    re.content_type,
                    re.file_size,

                    re.requested_by,
                    re.requested_at,
                    re.processing_started_at,
                    re.completed_at,
                    re.failed_at,
                    re.expires_at,

                    re.error_message,
                    re.source_export_id,
                    re.storage_key

                FROM report_exports re

                LEFT JOIN students s
                    ON s.id = re.student_id
                   AND s.organization_id =
                       re.organization_id

                LEFT JOIN academy_groups ag
                    ON ag.id = re.group_id
                   AND ag.organization_id =
                       re.organization_id

                WHERE re.id = ?
                  AND re.organization_id = ?

                  AND (
                      ? = TRUE
                      OR re.requested_by = ?
                  )
                """,
                (resultSet, rowNumber) ->
                        mapExportRecord(resultSet),
                exportId,
                actor.organizationId(),
                administrator,
                actor.userId()
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Report export was not found."
                )
        );
    }

    private void expireIfNecessary(
            AuthenticatedUser actor,
            UUID exportId
    ) {
        ExportRecord export =
                findAuthorizedRecord(
                        actor,
                        exportId
                );

        expireRecordIfNecessary(export);
    }

    private ExportRecord expireRecordIfNecessary(
            ExportRecord export
    ) {
        if (
                export.status()
                        == ReportExportStatus.COMPLETED
                && export.expiresAt() != null
                && !export.expiresAt().isAfter(
                        OffsetDateTime.now(
                                ZoneOffset.UTC
                        )
                )
        ) {
            markExpired(export);

            return export.withStatus(
                    ReportExportStatus.EXPIRED
            );
        }

        return export;
    }

    private void markExpired(ExportRecord export) {
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE report_exports
                SET
                    status = 'EXPIRED',
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND status = 'COMPLETED'
                """,
                now,
                export.id()
        );

        if (export.storageKey() != null) {
            try {
                reportStorage.delete(
                        export.storageKey()
                );
            } catch (RuntimeException ignored) {
                // Expiration remains valid even if storage
                // cleanup must be retried operationally.
            }
        }
    }

    private ExportRecord mapExportRecord(
            java.sql.ResultSet resultSet
    ) throws java.sql.SQLException {
        return new ExportRecord(
                resultSet.getObject("id", UUID.class),
                ReportExportType.valueOf(
                        resultSet.getString(
                                "report_type"
                        )
                ),
                ReportExportStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString(
                        "student_name"
                ),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "date_from",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "date_to",
                        LocalDate.class
                ),
                resultSet.getString("filename"),
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
                        "requested_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "processing_started_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "completed_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "failed_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "expires_at",
                        OffsetDateTime.class
                ),
                resultSet.getString(
                        "error_message"
                ),
                resultSet.getObject(
                        "source_export_id",
                        UUID.class
                ),
                resultSet.getString(
                        "storage_key"
                )
        );
    }

    private ReportExportResponse mapResponse(
            ExportRecord record
    ) {
        return new ReportExportResponse(
                record.id(),
                record.reportType(),
                record.status(),
                record.studentId(),
                record.studentNumber(),
                record.studentName(),
                record.groupId(),
                record.groupName(),
                record.dateFrom(),
                record.dateTo(),
                record.filename(),
                record.contentType(),
                record.fileSize(),
                record.requestedBy(),
                record.requestedAt(),
                record.processingStartedAt(),
                record.completedAt(),
                record.failedAt(),
                record.expiresAt(),
                record.errorMessage(),
                record.sourceExportId()
        );
    }

    private boolean isAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private void validateDateRange(
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (
                dateFrom != null
                && dateTo != null
                && dateTo.isBefore(dateFrom)
        ) {
            throw new BusinessRuleException(
                    "Date to cannot be before date from."
            );
        }
    }

    private record ExportRecord(
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
            UUID sourceExportId,
            String storageKey
    ) {
        ExportRecord withStatus(
                ReportExportStatus newStatus
        ) {
            return new ExportRecord(
                    id,
                    reportType,
                    newStatus,
                    studentId,
                    studentNumber,
                    studentName,
                    groupId,
                    groupName,
                    dateFrom,
                    dateTo,
                    filename,
                    contentType,
                    fileSize,
                    requestedBy,
                    requestedAt,
                    processingStartedAt,
                    completedAt,
                    failedAt,
                    expiresAt,
                    errorMessage,
                    sourceExportId,
                    storageKey
            );
        }
    }
}
