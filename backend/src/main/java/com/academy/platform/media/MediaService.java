package com.academy.platform.media;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class MediaService {

    private final JdbcTemplate jdbcTemplate;
    private final MediaObjectStorageService storageService;
    private final MediaStorageProperties properties;
    private final AuditService auditService;
    private final MediaAccessService mediaAccessService;

    public MediaService(
            JdbcTemplate jdbcTemplate,
            MediaObjectStorageService storageService,
            MediaStorageProperties properties,
            AuditService auditService,
            MediaAccessService mediaAccessService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageService = storageService;
        this.properties = properties;
        this.auditService = auditService;
        this.mediaAccessService = mediaAccessService;
    }

    @Transactional
    public MediaUploadResponse createUpload(
            AuthenticatedUser actor,
            CreateMediaUploadRequest request
    ) {
        MediaType mediaType
                = determineMediaType(
                        request.contentType()
                );

        validateSize(
                mediaType,
                request.size()
        );

        UUID mediaId = UUID.randomUUID();

        String filename
                = sanitizeFilename(request.filename());

        String storageKey
                = actor.organizationId()
                + "/"
                + mediaId
                + "/"
                + filename;

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO media_files
                (
                    id,
                    organization_id,
                    storage_bucket,
                    storage_key,
                    original_filename,
                    content_type,
                    media_type,
                    status,
                    expected_size,
                    actual_size,
                    title,
                    description,
                    uploaded_by,
                    upload_completed_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'PENDING',
                    ?,
                    NULL,
                    ?,
                    ?,
                    ?,
                    NULL,
                    ?,
                    ?,
                    0
                )
                """,
                mediaId,
                actor.organizationId(),
                storageService.bucket(),
                storageKey,
                filename,
                request.contentType()
                        .trim()
                        .toLowerCase(Locale.ROOT),
                mediaType.name(),
                request.size(),
                normalizeNullable(request.title()),
                normalizeNullable(
                        request.description()
                ),
                actor.userId(),
                now,
                now
        );

        MediaObjectStorageService.PresignedUpload presignedUpload
                = storageService.createUploadUrl(
                        storageKey,
                        request.contentType()
                                .trim()
                                .toLowerCase(Locale.ROOT)
                );

        auditService.record(
                actor,
                "MEDIA_UPLOAD_INITIALIZED",
                "MEDIA_FILE",
                mediaId,
                "Upload initialized for " + filename
        );

        return new MediaUploadResponse(
                mediaId,
                presignedUpload.url().toString(),
                "PUT",
                Map.of(
                        "Content-Type",
                        request.contentType()
                                .trim()
                                .toLowerCase(Locale.ROOT)
                ),
                presignedUpload.expiresAt()
        );
    }

    @Transactional
    public MediaResponse completeUpload(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        MediaRecord media = findRecordForUpdate(
                actor.organizationId(),
                mediaId
        );

        if (media.status() == MediaStatus.AVAILABLE) {
            return findMediaByOrganization(
                    actor.organizationId(),
                    mediaId
            );
        }

        if (media.status() != MediaStatus.PENDING) {
            throw new BusinessRuleException(
                    "This media upload cannot be completed."
            );
        }

        HeadObjectResponse objectMetadata;

        try {
            objectMetadata
                    = storageService.headObject(
                            media.storageKey()
                    );
        } catch (NoSuchKeyException exception) {
            throw new BusinessRuleException(
                    "The uploaded object could not be found."
            );
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new BusinessRuleException(
                        "The uploaded object could not be found."
                );
            }

            throw exception;
        }

        long actualSize
                = objectMetadata.contentLength();

        String actualContentType
                = objectMetadata.contentType();

        if (actualSize != media.expectedSize()) {
            markFailed(mediaId);

            storageService.deleteObject(
                    media.storageKey()
            );

            throw new BusinessRuleException(
                    "Uploaded file size does not match "
                    + "the declared size."
            );
        }

        if (actualContentType == null
                || !actualContentType.equalsIgnoreCase(
                        media.contentType()
                )) {
            markFailed(mediaId);

            storageService.deleteObject(
                    media.storageKey()
            );

            throw new BusinessRuleException(
                    "Uploaded file content type does not "
                    + "match the declared content type."
            );
        }

        OffsetDateTime completedAt
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE media_files
                SET
                    status = 'AVAILABLE',
                    actual_size = ?,
                    upload_completed_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'PENDING'
                """,
                actualSize,
                completedAt,
                completedAt,
                mediaId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "MEDIA_UPLOAD_COMPLETED",
                "MEDIA_FILE",
                mediaId,
                "Media upload completed."
        );

        return findMediaByOrganization(
                actor.organizationId(),
                mediaId
        );
    }

    @Transactional(readOnly = true)
    public MediaResponse findMedia(
            AuthenticatedUser actor,
            UUID mediaId
    ) {

        createDownloadUrl(
                actor,
                mediaId
        );

        mediaAccessService.authorizeMediaRead(
                actor,
                mediaId
        );

        return findMediaByOrganization(
                actor.organizationId(),
                mediaId
        );
    }

    private MediaResponse findMediaByOrganization(
            UUID organizationId,
            UUID mediaId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    original_filename,
                    content_type,
                    media_type,
                    status,
                    expected_size,
                    actual_size,
                    title,
                    description,
                    uploaded_by,
                    upload_completed_at,
                    created_at,
                    updated_at
                FROM media_files
                WHERE id = ?
                  AND organization_id = ?
                  AND status <> 'DELETED'
                """,
                (resultSet, rowNumber)
                -> mapMedia(resultSet),
                mediaId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Media file was not found."
                )
        );
    }

    @Transactional(readOnly = true)
    public List<MediaResponse> findMediaFiles(
            AuthenticatedUser actor,
            MediaType mediaType,
            MediaStatus status
    ) {
        boolean administrator
                = actor.roles().contains(
                        "ORGANIZATION_ADMIN"
                );

        return jdbcTemplate.query(
                """
            SELECT
                id,
                original_filename,
                content_type,
                media_type,
                status,
                expected_size,
                actual_size,
                title,
                description,
                uploaded_by,
                upload_completed_at,
                created_at,
                updated_at

            FROM media_files

            WHERE organization_id = ?
              AND status <> 'DELETED'

              AND (
                  ? = TRUE
                  OR uploaded_by = ?
              )

              AND (
                  ?::VARCHAR IS NULL
                  OR media_type = ?::VARCHAR
              )

              AND (
                  ?::VARCHAR IS NULL
                  OR status = ?::VARCHAR
              )

            ORDER BY created_at DESC
            """,
                (resultSet, rowNumber)
                -> mapMedia(resultSet),
                actor.organizationId(),
                administrator,
                actor.userId(),
                mediaType == null
                        ? null
                        : mediaType.name(),
                mediaType == null
                        ? null
                        : mediaType.name(),
                status == null
                        ? null
                        : status.name(),
                status == null
                        ? null
                        : status.name()
        );
    }

    @Transactional(readOnly = true)
    public MediaDownloadResponse createDownloadUrl(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        mediaAccessService.authorizeMediaRead(
                actor,
                mediaId
        );

        MediaRecord media = findRecord(
                actor.organizationId(),
                mediaId
        );

        if (media.status() != MediaStatus.AVAILABLE) {
            throw new BusinessRuleException(
                    "This media file is not available."
            );
        }

        MediaObjectStorageService.PresignedDownload download
                = storageService.createDownloadUrl(
                        media.storageKey(),
                        media.originalFilename()
                );

        return new MediaDownloadResponse(
                download.url().toString(),
                download.expiresAt()
        );
    }

    @Transactional
    public void deleteMedia(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        MediaRecord media = findRecordForUpdate(
                actor.organizationId(),
                mediaId
        );

        if (media.status() == MediaStatus.DELETED) {
            return;
        }

        if (media.status() == MediaStatus.AVAILABLE
                || media.status() == MediaStatus.PENDING) {
            storageService.deleteObject(
                    media.storageKey()
            );
        }

        OffsetDateTime deletedAt
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE media_files
                SET
                    status = 'DELETED',
                    deleted_by = ?,
                    deleted_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                actor.userId(),
                deletedAt,
                deletedAt,
                mediaId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "MEDIA_DELETED",
                "MEDIA_FILE",
                mediaId,
                "Media file deleted."
        );
    }

    private MediaRecord findRecord(
            UUID organizationId,
            UUID mediaId
    ) {
        return findRecord(
                organizationId,
                mediaId,
                false
        );
    }

    private MediaRecord findRecordForUpdate(
            UUID organizationId,
            UUID mediaId
    ) {
        return findRecord(
                organizationId,
                mediaId,
                true
        );
    }

    private MediaRecord findRecord(
            UUID organizationId,
            UUID mediaId,
            boolean lock
    ) {
        String sql = """
                SELECT
                    id,
                    storage_key,
                    original_filename,
                    content_type,
                    media_type,
                    status,
                    expected_size
                FROM media_files
                WHERE id = ?
                  AND organization_id = ?
                """
                + (lock ? " FOR UPDATE" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber)
                -> new MediaRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "storage_key"
                        ),
                        resultSet.getString(
                                "original_filename"
                        ),
                        resultSet.getString(
                                "content_type"
                        ),
                        MediaType.valueOf(
                                resultSet.getString(
                                        "media_type"
                                )
                        ),
                        MediaStatus.valueOf(
                                resultSet.getString(
                                        "status"
                                )
                        ),
                        resultSet.getLong(
                                "expected_size"
                        )
                ),
                mediaId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Media file was not found."
                )
        );
    }

    private void markFailed(UUID mediaId) {
        jdbcTemplate.update(
                """
                UPDATE media_files
                SET
                    status = 'FAILED',
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                mediaId
        );
    }

    private MediaType determineMediaType(
            String contentType
    ) {
        String normalized = contentType
                .trim()
                .toLowerCase(Locale.ROOT);

        return switch (normalized) {
            case "image/jpeg", "image/png", "image/webp" ->
                MediaType.IMAGE;

            case "video/mp4", "video/webm", "video/quicktime" ->
                MediaType.VIDEO;

            case "application/pdf" ->
                MediaType.DOCUMENT;

            default ->
                throw new BusinessRuleException(
                        "This file type is not supported."
                );
        };
    }

    private void validateSize(
            MediaType mediaType,
            long size
    ) {
        long maximum = switch (mediaType) {
            case IMAGE ->
                properties.maximumImageSize();

            case VIDEO ->
                properties.maximumVideoSize();

            case DOCUMENT ->
                properties.maximumDocumentSize();
        };

        if (size > maximum) {
            throw new BusinessRuleException(
                    "The selected file exceeds the "
                    + "maximum allowed size."
            );
        }
    }

    private String sanitizeFilename(
            String filename
    ) {
        String normalized = filename
                .trim()
                .replace("\\", "/");

        int separator
                = normalized.lastIndexOf('/');

        if (separator >= 0) {
            normalized
                    = normalized.substring(separator + 1);
        }

        normalized = normalized.replaceAll(
                "[^A-Za-z0-9._-]",
                "_"
        );

        if (normalized.isBlank()) {
            return "file";
        }

        return normalized.length() > 200
                ? normalized.substring(
                        normalized.length() - 200
                )
                : normalized;
    }

    private MediaResponse mapMedia(
            ResultSet resultSet
    ) throws SQLException {
        return new MediaResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString(
                        "original_filename"
                ),
                resultSet.getString("content_type"),
                MediaType.valueOf(
                        resultSet.getString(
                                "media_type"
                        )
                ),
                MediaStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getLong("expected_size"),
                resultSet.getObject(
                        "actual_size",
                        Long.class
                ),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getObject(
                        "uploaded_by",
                        UUID.class
                ),
                resultSet.getObject(
                        "upload_completed_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "created_at",
                        OffsetDateTime.class
                ),
                resultSet.getObject(
                        "updated_at",
                        OffsetDateTime.class
                )
        );
    }

    private String normalizeNullable(
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record MediaRecord(
            UUID id,
            String storageKey,
            String originalFilename,
            String contentType,
            MediaType mediaType,
            MediaStatus status,
            long expectedSize
            ) {

    }
}
