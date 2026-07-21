package com.academy.platform.media;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

@Service
public class MediaLinkService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final MediaAccessService mediaAccessService;

    public MediaLinkService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService,
            MediaAccessService mediaAccessService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
        this.mediaAccessService = mediaAccessService;
    }

    @Transactional
    public MediaLinkResponse createLink(
            AuthenticatedUser actor,
            UUID mediaId,
            CreateMediaLinkRequest request
    ) {
        MediaRecord media = findAvailableMedia(
                actor.organizationId(),
                mediaId
        );

        validateMediaOwnership(actor, media);

        TargetRecord target = findTarget(
                actor.organizationId(),
                request.targetType(),
                request.targetId()
        );

        validateTargetAccess(actor, target);

        ensureLinkDoesNotExist(
                actor.organizationId(),
                mediaId,
                request.targetType(),
                request.targetId()
        );

        if (request.coverMedia()) {
            clearExistingCover(
                    actor.organizationId(),
                    request.targetType(),
                    request.targetId()
            );
        }

        UUID linkId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
        INSERT INTO media_links
        (
            id,
            organization_id,
            media_id,
            student_id,
            group_id,
            session_id,
            evaluation_id,
            caption,
            purpose,
            cover_media,
            linked_by,
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
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            0
        )
        """,
                linkId,
                actor.organizationId(),
                mediaId,
                targetIdFor(
                        request,
                        MediaTargetType.STUDENT
                ),
                targetIdFor(
                        request,
                        MediaTargetType.GROUP
                ),
                targetIdFor(
                        request,
                        MediaTargetType.SESSION
                ),
                targetIdFor(
                        request,
                        MediaTargetType.EVALUATION
                ),
                normalizeNullable(request.caption()),
                request.purpose().name(),
                request.coverMedia(),
                actor.userId(),
                now,
                now
        );

        auditService.record(
                actor,
                "MEDIA_LINK_CREATED",
                "MEDIA_LINK",
                linkId,
                "Media "
                + mediaId
                + " linked to "
                + request.targetType()
                + " "
                + request.targetId()
        );

        return findLink(
                actor,
                linkId
        );
    }

    @Transactional
    public MediaLinkResponse updateLink(
            AuthenticatedUser actor,
            UUID linkId,
            UpdateMediaLinkRequest request
    ) {
        LinkRecord link = findLinkRecord(
                actor.organizationId(),
                linkId,
                true
        );

        validateLinkManagement(actor, link);

        if (request.coverMedia()) {
            clearExistingCover(
                    actor.organizationId(),
                    link.targetType(),
                    link.targetId()
            );
        }

        OffsetDateTime updatedAt
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE media_links
                SET
                  purpose = ?,
                  caption = ?,
                  cover_media = ?,
                  updated_at = ?,
                  version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                request.purpose().name(),
                normalizeNullable(request.caption()),
                request.coverMedia(),
                updatedAt,
                linkId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "MEDIA_LINK_UPDATED",
                "MEDIA_LINK",
                linkId,
                "Media link metadata updated."
        );

        return findLink(actor, linkId);
    }

    @Transactional
    public void deleteLink(
            AuthenticatedUser actor,
            UUID linkId
    ) {
        LinkRecord link = findLinkRecord(
                actor.organizationId(),
                linkId,
                true
        );

        validateLinkManagement(actor, link);

        jdbcTemplate.update(
                """
                DELETE FROM media_links
                WHERE id = ?
                  AND organization_id = ?
                """,
                linkId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "MEDIA_LINK_DELETED",
                "MEDIA_LINK",
                linkId,
                "Media link removed from "
                + link.targetType()
                + " "
                + link.targetId()
        );
    }

    @Transactional(readOnly = true)
    public MediaLinkResponse findLink(
            AuthenticatedUser actor,
            UUID linkId
    ) {
        LinkRecord link = findLinkRecord(
                actor.organizationId(),
                linkId,
                false
        );

        mediaAccessService.authorizeMediaRead(
                actor,
                link.mediaId()
        );

        return mapLinkResponse(link);
    }

    @Transactional(readOnly = true)
    public List<MediaLinkResponse> findTargetMedia(
            AuthenticatedUser actor,
            MediaTargetType targetType,
            UUID targetId
    ) {
        TargetRecord target = findTarget(
                actor.organizationId(),
                targetType,
                targetId
        );

        mediaAccessService.authorizeTargetRead(
                actor,
                targetType,
                targetId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    ml.id,
                    ml.media_id,    
                    mf.original_filename,
                    mf.content_type,
                    mf.media_type,
                    mf.status AS media_status,
                    mf.actual_size,
                    mf.title AS media_title,
                    mf.description AS media_description,    
                    ml.student_id,
                    ml.group_id,
                    ml.session_id,
                    ml.evaluation_id,       
                    ml.caption,
                    ml.purpose,
                    ml.cover_media,
                    ml.linked_by,
                    ml.created_at,
                    ml.updated_at

                FROM media_links ml

                JOIN media_files mf
                    ON mf.id = ml.media_id
                   AND mf.organization_id =
                       ml.organization_id

                WHERE ml.organization_id = ?
                  AND mf.status = 'AVAILABLE'
                  AND (
                      (
                          ? = 'STUDENT'
                          AND ml.student_id = ?
                      )
                      OR
                      (
                          ? = 'GROUP'
                          AND ml.group_id = ?
                      )
                      OR
                      (
                          ? = 'SESSION'
                          AND ml.session_id = ?
                      )
                      OR
                      (
                          ? = 'EVALUATION'
                          AND ml.evaluation_id = ?
                      )
                  )

                ORDER BY
                    ml.cover_media DESC,
                    ml.created_at DESC
                """,
                (resultSet, rowNumber)
                -> mapLinkRecord(
                        resultSet,
                        target
                ),
                actor.organizationId(),
                targetType.name(),
                targetId,
                targetType.name(),
                targetId,
                targetType.name(),
                targetId,
                targetType.name(),
                targetId
        )
                .stream()
                .filter(link
                        -> guardianCanSeeLink(actor, link)
                )
                .map(this::mapLinkResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MediaLinkResponse> findMediaLinks(
            AuthenticatedUser actor,
            UUID mediaId
    ) {
        MediaRecord media = findAvailableMedia(
                actor.organizationId(),
                mediaId
        );

        validateMediaOwnership(actor, media);

        return jdbcTemplate.query(
                """
                SELECT
                    ml.id,
                    ml.media_id,

                    mf.original_filename,
                    mf.content_type,
                    mf.media_type,
                    mf.status AS media_status,
                    mf.actual_size,
                    mf.title AS media_title,
                    mf.description AS media_description,

                    ml.student_id,
                    ml.group_id,
                    ml.session_id,
                    ml.evaluation_id,

                    ml.caption,
                    ml.purpose,
                    ml.cover_media,
                    ml.linked_by,
                    ml.created_at,
                    ml.updated_at

                FROM media_links ml

                JOIN media_files mf
                    ON mf.id = ml.media_id
                   AND mf.organization_id =
                       ml.organization_id

                WHERE ml.organization_id = ?
                  AND ml.media_id = ?

                ORDER BY ml.created_at
                """,
                (resultSet, rowNumber) -> {
                    MediaTargetType targetType
                    = determineTargetType(
                            resultSet
                    );

                    UUID targetId
                    = determineTargetId(
                            resultSet,
                            targetType
                    );

                    TargetRecord target
                    = findTarget(
                            actor.organizationId(),
                            targetType,
                            targetId
                    );

                    return mapLinkRecord(
                            resultSet,
                            target
                    );
                },
                actor.organizationId(),
                mediaId
        )
                .stream()
                .map(this::mapLinkResponse)
                .toList();
    }

    private MediaRecord findAvailableMedia(
            UUID organizationId,
            UUID mediaId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    uploaded_by,
                    status
                FROM media_files
                WHERE id = ?
                  AND organization_id = ?
                  AND status <> 'DELETED'
                """,
                (resultSet, rowNumber)
                -> new MediaRecord(
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "uploaded_by",
                                UUID.class
                        ),
                        MediaStatus.valueOf(
                                resultSet.getString(
                                        "status"
                                )
                        )
                ),
                mediaId,
                organizationId
        ).stream().findFirst().map(media -> {
            if (media.status()
                    != MediaStatus.AVAILABLE) {
                throw new BusinessRuleException(
                        "Only available media can be linked."
                );
            }

            return media;
        }).orElseThrow(
                () -> new ResourceNotFoundException(
                        "Media file was not found."
                )
        );
    }

    private void validateMediaOwnership(
            AuthenticatedUser actor,
            MediaRecord media
    ) {
        if (isAdministrator(actor)) {
            return;
        }

        if (!media.uploadedBy().equals(
                actor.userId()
        )) {
            throw new ResourceNotFoundException(
                    "Media file was not found."
            );
        }
    }

    private TargetRecord findTarget(
            UUID organizationId,
            MediaTargetType targetType,
            UUID targetId
    ) {
        return switch (targetType) {
            case STUDENT ->
                findStudentTarget(
                organizationId,
                targetId
                );

            case GROUP ->
                findGroupTarget(
                organizationId,
                targetId
                );

            case SESSION ->
                findSessionTarget(
                organizationId,
                targetId
                );

            case EVALUATION ->
                findEvaluationTarget(
                organizationId,
                targetId
                );
        };
    }

    private TargetRecord findStudentTarget(
            UUID organizationId,
            UUID studentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    CONCAT(
                        first_name,
                        ' ',
                        last_name
                    ) AS target_name
                FROM students
                WHERE id = ?
                  AND organization_id = ?
                  AND status <> 'ARCHIVED'
                """,
                (resultSet, rowNumber)
                -> new TargetRecord(
                        MediaTargetType.STUDENT,
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "target_name"
                        ),
                        null,
                        null
                ),
                studentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student was not found."
                )
        );
    }

    private TargetRecord findGroupTarget(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    name
                FROM academy_groups
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber)
                -> new TargetRecord(
                        MediaTargetType.GROUP,
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString("name"),
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        null
                ),
                groupId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    private TargetRecord findSessionTarget(
            UUID organizationId,
            UUID sessionId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    group_id,
                    title,
                    scheduled_start
                FROM lesson_sessions
                WHERE id = ?
                  AND organization_id = ?
                """,
                (resultSet, rowNumber)
                -> new TargetRecord(
                        MediaTargetType.SESSION,
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString("title"),
                        resultSet.getObject(
                                "group_id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "scheduled_start",
                                OffsetDateTime.class
                        ).toLocalDate()
                ),
                sessionId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Session was not found."
                )
        );
    }

    private TargetRecord findEvaluationTarget(
            UUID organizationId,
            UUID evaluationId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    se.id,
                    se.group_id,
                    se.evaluation_date,

                    CONCAT(
                        s.first_name,
                        ' ',
                        s.last_name,
                        ' - ',
                        et.name
                    ) AS target_name

                FROM student_evaluations se

                JOIN students s
                    ON s.id = se.student_id
                   AND s.organization_id =
                       se.organization_id

                JOIN evaluation_templates et
                    ON et.id = se.template_id
                   AND et.organization_id =
                       se.organization_id

                WHERE se.id = ?
                  AND se.organization_id = ?
                """,
                (resultSet, rowNumber)
                -> new TargetRecord(
                        MediaTargetType.EVALUATION,
                        resultSet.getObject(
                                "id",
                                UUID.class
                        ),
                        resultSet.getString(
                                "target_name"
                        ),
                        resultSet.getObject(
                                "group_id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "evaluation_date",
                                LocalDate.class
                        )
                ),
                evaluationId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student evaluation was not found."
                )
        );
    }

    private void validateTargetAccess(
            AuthenticatedUser actor,
            TargetRecord target
    ) {
        if (isAdministrator(actor)) {
            return;
        }

        UUID staffId = findCurrentStaffId(actor);

        if (target.targetType()
                == MediaTargetType.STUDENT) {

            validateStudentAccess(
                    actor.organizationId(),
                    target.targetId(),
                    staffId
            );

            return;
        }

        validateGroupAccess(
                actor.organizationId(),
                target.groupId(),
                staffId,
                target.operationDate()
        );
    }

    private void validateStudentAccess(
            UUID organizationId,
            UUID studentId,
            UUID staffId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT ge.group_id)

                FROM group_enrollments ge

                JOIN group_staff_assignments gsa
                    ON gsa.group_id = ge.group_id
                   AND gsa.organization_id =
                       ge.organization_id

                WHERE ge.organization_id = ?
                  AND ge.student_id = ?
                  AND gsa.staff_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND gsa.status <> 'CANCELLED'
                  AND gsa.start_date <=
                      COALESCE(
                          ge.ended_at,
                          CURRENT_DATE
                      )
                  AND (
                      gsa.end_date IS NULL
                      OR gsa.end_date >=
                         ge.enrolled_at
                  )
                """,
                Integer.class,
                organizationId,
                studentId,
                staffId
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }
    }

    private void validateGroupAccess(
            UUID organizationId,
            UUID groupId,
            UUID staffId,
            LocalDate operationDate
    ) {
        if (groupId == null) {
            throw new ResourceNotFoundException(
                    "Media target was not found."
            );
        }

        Integer count;

        if (operationDate == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM group_staff_assignments
                    WHERE organization_id = ?
                      AND group_id = ?
                      AND staff_id = ?
                      AND status = 'ACTIVE'
                    """,
                    Integer.class,
                    organizationId,
                    groupId,
                    staffId
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM group_staff_assignments
                    WHERE organization_id = ?
                      AND group_id = ?
                      AND staff_id = ?
                      AND status <> 'CANCELLED'
                      AND start_date <= ?
                      AND (
                          end_date IS NULL
                          OR end_date >= ?
                      )
                    """,
                    Integer.class,
                    organizationId,
                    groupId,
                    staffId,
                    operationDate,
                    operationDate
            );
        }

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Media target was not found."
            );
        }
    }

    private void validateLinkManagement(
            AuthenticatedUser actor,
            LinkRecord link
    ) {
        TargetRecord target = findTarget(
                actor.organizationId(),
                link.targetType(),
                link.targetId()
        );

        validateTargetAccess(actor, target);

        if (!isAdministrator(actor)
                && !link.linkedBy().equals(
                        actor.userId()
                )) {
            throw new ResourceNotFoundException(
                    "Media link was not found."
            );
        }
    }

    private UUID findCurrentStaffId(
            AuthenticatedUser actor
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM staff_members
                WHERE organization_id = ?
                  AND membership_id = ?
                  AND employment_status = 'ACTIVE'
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject(
                        "id",
                        UUID.class
                ),
                actor.organizationId(),
                actor.membershipId()
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Media target was not found."
                )
        );
    }

    private void ensureLinkDoesNotExist(
            UUID organizationId,
            UUID mediaId,
            MediaTargetType targetType,
            UUID targetId
    ) {
        String column = targetColumn(targetType);

        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM media_links
                WHERE organization_id = ?
                  AND media_id = ?
                  AND %s = ?
                """.formatted(column),
                Integer.class,
                organizationId,
                mediaId,
                targetId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "This media file is already linked "
                    + "to the selected entity."
            );
        }
    }

    private void clearExistingCover(
            UUID organizationId,
            MediaTargetType targetType,
            UUID targetId
    ) {
        String column = targetColumn(targetType);

        jdbcTemplate.update(
                """
                UPDATE media_links
                SET
                    cover_media = FALSE,
                    updated_at = ?,
                    version = version + 1
                WHERE organization_id = ?
                  AND %s = ?
                  AND cover_media = TRUE
                """.formatted(column),
                OffsetDateTime.now(ZoneOffset.UTC),
                organizationId,
                targetId
        );
    }

    private LinkRecord findLinkRecord(
            UUID organizationId,
            UUID linkId,
            boolean lock
    ) {
        String sql = """
                SELECT
                    ml.id,
                    ml.media_id,

                    mf.original_filename,
                    mf.content_type,
                    mf.media_type,
                    mf.status AS media_status,
                    mf.actual_size,
                    mf.title AS media_title,
                    mf.description AS media_description,

                    ml.student_id,
                    ml.group_id,
                    ml.session_id,
                    ml.evaluation_id,

                    ml.caption,
                    ml.purpose,
                    ml.cover_media,
                    ml.linked_by,
                    ml.created_at,
                    ml.updated_at

                FROM media_links ml

                JOIN media_files mf
                    ON mf.id = ml.media_id
                   AND mf.organization_id =
                       ml.organization_id

                WHERE ml.id = ?
                  AND ml.organization_id = ?
                """
                + (lock ? " FOR UPDATE OF ml" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) -> {
                    MediaTargetType targetType
                    = determineTargetType(
                            resultSet
                    );

                    UUID targetId
                    = determineTargetId(
                            resultSet,
                            targetType
                    );

                    TargetRecord target
                    = findTarget(
                            organizationId,
                            targetType,
                            targetId
                    );

                    return mapLinkRecord(
                            resultSet,
                            target
                    );
                },
                linkId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Media link was not found."
                )
        );
    }

    private LinkRecord mapLinkRecord(
            ResultSet resultSet,
            TargetRecord target
    ) throws SQLException {
        return new LinkRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "media_id",
                        UUID.class
                ),
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
                        resultSet.getString(
                                "media_status"
                        )
                ),
                resultSet.getObject(
                        "actual_size",
                        Long.class
                ),
                resultSet.getString("media_title"),
                resultSet.getString(
                        "media_description"
                ),
                target.targetType(),
                target.targetId(),
                target.targetName(),
                MediaPurpose.valueOf(
                        resultSet.getString("purpose")
                ),
                resultSet.getString("caption"),
                resultSet.getBoolean("cover_media"),
                resultSet.getObject(
                        "linked_by",
                        UUID.class
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

    private MediaLinkResponse mapLinkResponse(
            LinkRecord link
    ) {
        return new MediaLinkResponse(
                link.id(),
                link.mediaId(),
                link.originalFilename(),
                link.contentType(),
                link.mediaType(),
                link.mediaStatus(),
                link.actualSize(),
                link.mediaTitle(),
                link.mediaDescription(),
                link.targetType(),
                link.targetId(),
                link.targetName(),
                link.purpose(),
                link.caption(),
                link.coverMedia(),
                link.linkedBy(),
                link.createdAt(),
                link.updatedAt()
        );
    }

    private MediaTargetType determineTargetType(
            ResultSet resultSet
    ) throws SQLException {
        if (resultSet.getObject(
                "student_id"
        ) != null) {
            return MediaTargetType.STUDENT;
        }

        if (resultSet.getObject(
                "group_id"
        ) != null) {
            return MediaTargetType.GROUP;
        }

        if (resultSet.getObject(
                "session_id"
        ) != null) {
            return MediaTargetType.SESSION;
        }

        return MediaTargetType.EVALUATION;
    }

    private UUID determineTargetId(
            ResultSet resultSet,
            MediaTargetType targetType
    ) throws SQLException {
        return resultSet.getObject(
                targetColumn(targetType),
                UUID.class
        );
    }

    private UUID targetIdFor(
            CreateMediaLinkRequest request,
            MediaTargetType expectedType
    ) {
        return request.targetType() == expectedType
                ? request.targetId()
                : null;
    }

    private String targetColumn(
            MediaTargetType targetType
    ) {
        return switch (targetType) {
            case STUDENT ->
                "student_id";
            case GROUP ->
                "group_id";
            case SESSION ->
                "session_id";
            case EVALUATION ->
                "evaluation_id";
        };
    }

    private boolean isAdministrator(
            AuthenticatedUser actor
    ) {
        return actor.roles().contains(
                "ORGANIZATION_ADMIN"
        );
    }

    private boolean guardianCanSeeLink(
            AuthenticatedUser actor,
            LinkRecord link
    ) {
        if (!actor.roles().contains("GUARDIAN")) {
            return true;
        }

        Integer count = switch (link.targetType()) {
            case STUDENT ->
                countGuardianStudentConsent(
                actor,
                link.targetId(),
                link.purpose()
                );

            case GROUP ->
                countGuardianGroupConsent(
                actor,
                link.targetId(),
                link.purpose()
                );

            case SESSION ->
                countGuardianSessionConsent(
                actor,
                link.targetId(),
                link.purpose()
                );

            case EVALUATION ->
                countGuardianEvaluationConsent(
                actor,
                link.targetId(),
                link.purpose()
                );
        };

        return count != null && count > 0;
    }

    private Integer countGuardianStudentConsent(
            AuthenticatedUser actor,
            UUID studentId,
            MediaPurpose purpose
    ) {
        return jdbcTemplate.queryForObject(
                """
            SELECT COUNT(*)
            FROM guardians g

            JOIN student_guardians sg
              ON sg.guardian_id = g.id
             AND sg.organization_id =
                 g.organization_id

            WHERE g.organization_id = ?
              AND g.membership_id = ?
              AND sg.student_id = ?
              AND (
                  (
                      ? = 'INTERNAL'
                      AND sg.internal_media_consent = TRUE
                  )
                  OR
                  (
                      ? = 'MARKETING'
                      AND sg.marketing_media_consent = TRUE
                  )
              )
            """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                studentId,
                purpose.name(),
                purpose.name()
        );
    }

    private Integer countGuardianGroupConsent(
            AuthenticatedUser actor,
            UUID groupId,
            MediaPurpose purpose
    ) {
        return jdbcTemplate.queryForObject(
                """
            SELECT COUNT(*)
            FROM guardians g

            JOIN student_guardians sg
              ON sg.guardian_id = g.id
             AND sg.organization_id =
                 g.organization_id

            JOIN group_enrollments ge
              ON ge.student_id = sg.student_id
             AND ge.organization_id =
                 sg.organization_id

            WHERE g.organization_id = ?
              AND g.membership_id = ?
              AND ge.group_id = ?
              AND ge.status <> 'CANCELLED'
              AND (
                  (
                      ? = 'INTERNAL'
                      AND sg.internal_media_consent = TRUE
                  )
                  OR
                  (
                      ? = 'MARKETING'
                      AND sg.marketing_media_consent = TRUE
                  )
              )
            """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                groupId,
                purpose.name(),
                purpose.name()
        );
    }

    private Integer countGuardianSessionConsent(
            AuthenticatedUser actor,
            UUID sessionId,
            MediaPurpose purpose
    ) {
        return jdbcTemplate.queryForObject(
                """
            SELECT COUNT(*)
            FROM guardians g

            JOIN student_guardians sg
              ON sg.guardian_id = g.id
             AND sg.organization_id =
                 g.organization_id

            JOIN lesson_sessions ls
              ON ls.organization_id =
                 sg.organization_id
             AND ls.id = ?

            JOIN organizations o
              ON o.id = ls.organization_id

            JOIN group_enrollments ge
              ON ge.organization_id =
                 ls.organization_id
             AND ge.group_id = ls.group_id
             AND ge.student_id =
                 sg.student_id

            WHERE g.organization_id = ?
              AND g.membership_id = ?
              AND ge.status <> 'CANCELLED'
              AND ge.enrolled_at <=
                  (
                      ls.scheduled_start
                      AT TIME ZONE o.timezone
                  )::DATE
              AND (
                  ge.ended_at IS NULL
                  OR ge.ended_at >=
                     (
                         ls.scheduled_start
                         AT TIME ZONE o.timezone
                     )::DATE
              )
              AND (
                  (
                      ? = 'INTERNAL'
                      AND sg.internal_media_consent = TRUE
                  )
                  OR
                  (
                      ? = 'MARKETING'
                      AND sg.marketing_media_consent = TRUE
                  )
              )
            """,
                Integer.class,
                sessionId,
                actor.organizationId(),
                actor.membershipId(),
                purpose.name(),
                purpose.name()
        );
    }

    private Integer countGuardianEvaluationConsent(
            AuthenticatedUser actor,
            UUID evaluationId,
            MediaPurpose purpose
    ) {
        return jdbcTemplate.queryForObject(
                """
            SELECT COUNT(*)
            FROM guardians g

            JOIN student_guardians sg
              ON sg.guardian_id = g.id
             AND sg.organization_id =
                 g.organization_id

            JOIN student_evaluations se
              ON se.student_id = sg.student_id
             AND se.organization_id =
                 sg.organization_id

            WHERE g.organization_id = ?
              AND g.membership_id = ?
              AND se.id = ?
              AND se.status = 'PUBLISHED'
              AND (
                  (
                      ? = 'INTERNAL'
                      AND sg.internal_media_consent = TRUE
                  )
                  OR
                  (
                      ? = 'MARKETING'
                      AND sg.marketing_media_consent = TRUE
                  )
              )
            """,
                Integer.class,
                actor.organizationId(),
                actor.membershipId(),
                evaluationId,
                purpose.name(),
                purpose.name()
        );
    }

    private String guardianConsentSql(
            MediaTargetType targetType
    ) {
        String consentExpression
                = """
            (
                (? = 'INTERNAL'
                 AND sg.internal_media_consent = TRUE)
                OR
                (? = 'MARKETING'
                 AND sg.marketing_media_consent = TRUE)
            )
            """;

        /*
     * To keep parameter ordering simple, each SQL query
     * uses the purpose twice. The calling method below
     * should therefore pass the purpose twice.
         */
        return switch (targetType) {
            case STUDENT ->
                """
                SELECT COUNT(*)
                FROM guardians g
                JOIN student_guardians sg
                  ON sg.guardian_id = g.id
                 AND sg.organization_id =
                     g.organization_id
                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND sg.student_id = ?
                  AND %s
                """.formatted(consentExpression);

            case GROUP ->
                """
                SELECT COUNT(*)
                FROM guardians g
                JOIN student_guardians sg
                  ON sg.guardian_id = g.id
                 AND sg.organization_id =
                     g.organization_id
                JOIN group_enrollments ge
                  ON ge.student_id = sg.student_id
                 AND ge.organization_id =
                     sg.organization_id
                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND ge.group_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND %s
                """.formatted(consentExpression);

            case SESSION ->
                """
                SELECT COUNT(*)
                FROM guardians g
                JOIN student_guardians sg
                  ON sg.guardian_id = g.id
                 AND sg.organization_id =
                     g.organization_id
                JOIN lesson_sessions ls
                  ON ls.organization_id =
                     sg.organization_id
                 AND ls.id = ?
                JOIN group_enrollments ge
                  ON ge.organization_id =
                     ls.organization_id
                 AND ge.group_id = ls.group_id
                 AND ge.student_id =
                     sg.student_id
                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND ge.status <> 'CANCELLED'
                  AND %s
                """.formatted(consentExpression);

            case EVALUATION ->
                """
                SELECT COUNT(*)
                FROM guardians g
                JOIN student_guardians sg
                  ON sg.guardian_id = g.id
                 AND sg.organization_id =
                     g.organization_id
                JOIN student_evaluations se
                  ON se.student_id = sg.student_id
                 AND se.organization_id =
                     sg.organization_id
                WHERE g.organization_id = ?
                  AND g.membership_id = ?
                  AND se.id = ?
                  AND se.status = 'PUBLISHED'
                  AND %s
                """.formatted(consentExpression);
        };
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
            UUID uploadedBy,
            MediaStatus status
            ) {

    }

    private record TargetRecord(
            MediaTargetType targetType,
            UUID targetId,
            String targetName,
            UUID groupId,
            LocalDate operationDate
            ) {

    }

    private record LinkRecord(
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
}
