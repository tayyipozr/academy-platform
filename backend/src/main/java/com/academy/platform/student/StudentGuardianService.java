package com.academy.platform.student;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentGuardianService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public StudentGuardianService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StudentGuardianResponse> findGuardians(
            UUID organizationId,
            UUID studentId
    ) {
        validateStudent(
                organizationId,
                studentId
        );

        return jdbcTemplate.query(
                """
                SELECT
                    sg.student_id,
                    sg.guardian_id,
                    g.guardian_number,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    g.phone,
                    sg.relationship_type,
                    sg.primary_contact,
                    sg.legal_guardian,
                    sg.pickup_authorized,
                    sg.receives_notifications,
                    sg.internal_media_consent,
                    sg.marketing_media_consent,
                    sg.consent_recorded_at,
                    sg.created_at,
                    sg.updated_at

                FROM student_guardians sg

                JOIN guardians g
                    ON g.id = sg.guardian_id
                   AND g.organization_id =
                       sg.organization_id

                JOIN organization_memberships om
                    ON om.id = g.membership_id
                   AND om.organization_id =
                       g.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE sg.organization_id = ?
                  AND sg.student_id = ?

                ORDER BY
                    sg.primary_contact DESC,
                    om.display_first_name,
                    om.display_last_name
                """,
                (resultSet, rowNumber) ->
                        mapRelationship(resultSet),
                organizationId,
                studentId
        );
    }

    @Transactional
    public StudentGuardianResponse linkGuardian(
            AuthenticatedUser actor,
            UUID studentId,
            SaveStudentGuardianRequest request
    ) {
        validateStudent(
                actor.organizationId(),
                studentId
        );

        validateGuardian(
                actor.organizationId(),
                request.guardianId()
        );

        ensureRelationshipDoesNotExist(
                studentId,
                request.guardianId()
        );

        if (request.primaryContact()) {
            clearExistingPrimaryContact(
                    actor.organizationId(),
                    studentId
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        OffsetDateTime consentRecordedAt =
                hasAnyConsent(request) ? now : null;

        jdbcTemplate.update(
                """
                INSERT INTO student_guardians
                (
                    organization_id,
                    student_id,
                    guardian_id,
                    relationship_type,
                    primary_contact,
                    legal_guardian,
                    pickup_authorized,
                    receives_notifications,
                    internal_media_consent,
                    marketing_media_consent,
                    consent_recorded_at,
                    created_at,
                    updated_at
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
                    ?
                )
                """,
                actor.organizationId(),
                studentId,
                request.guardianId(),
                request.relationshipType().name(),
                request.primaryContact(),
                request.legalGuardian(),
                request.pickupAuthorized(),
                request.receivesNotifications(),
                request.internalMediaConsent(),
                request.marketingMediaConsent(),
                consentRecordedAt,
                now,
                now
        );

        auditService.record(
                actor,
                "STUDENT_GUARDIAN_LINKED",
                "STUDENT",
                studentId,
                "Guardian linked: "
                        + request.guardianId()
        );

        return findRelationship(
                actor.organizationId(),
                studentId,
                request.guardianId()
        );
    }

    @Transactional
    public StudentGuardianResponse updateRelationship(
            AuthenticatedUser actor,
            UUID studentId,
            UUID guardianId,
            SaveStudentGuardianRequest request
    ) {
        validateStudent(
                actor.organizationId(),
                studentId
        );

        validateGuardian(
                actor.organizationId(),
                guardianId
        );

        findRelationship(
                actor.organizationId(),
                studentId,
                guardianId
        );

        if (!guardianId.equals(request.guardianId())) {
            throw new ConflictException(
                    "The guardian linked to a relationship "
                            + "cannot be changed."
            );
        }

        if (request.primaryContact()) {
            clearExistingPrimaryContact(
                    actor.organizationId(),
                    studentId
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        OffsetDateTime consentRecordedAt =
                hasAnyConsent(request) ? now : null;

        jdbcTemplate.update(
                """
                UPDATE student_guardians
                SET
                    relationship_type = ?,
                    primary_contact = ?,
                    legal_guardian = ?,
                    pickup_authorized = ?,
                    receives_notifications = ?,
                    internal_media_consent = ?,
                    marketing_media_consent = ?,
                    consent_recorded_at = ?,
                    updated_at = ?
                WHERE organization_id = ?
                  AND student_id = ?
                  AND guardian_id = ?
                """,
                request.relationshipType().name(),
                request.primaryContact(),
                request.legalGuardian(),
                request.pickupAuthorized(),
                request.receivesNotifications(),
                request.internalMediaConsent(),
                request.marketingMediaConsent(),
                consentRecordedAt,
                now,
                actor.organizationId(),
                studentId,
                guardianId
        );

        auditService.record(
                actor,
                "STUDENT_GUARDIAN_UPDATED",
                "STUDENT",
                studentId,
                "Guardian relationship updated: "
                        + guardianId
        );

        return findRelationship(
                actor.organizationId(),
                studentId,
                guardianId
        );
    }

    @Transactional
    public void unlinkGuardian(
            AuthenticatedUser actor,
            UUID studentId,
            UUID guardianId
    ) {
        findRelationship(
                actor.organizationId(),
                studentId,
                guardianId
        );

        jdbcTemplate.update(
                """
                DELETE FROM student_guardians
                WHERE organization_id = ?
                  AND student_id = ?
                  AND guardian_id = ?
                """,
                actor.organizationId(),
                studentId,
                guardianId
        );

        auditService.record(
                actor,
                "STUDENT_GUARDIAN_UNLINKED",
                "STUDENT",
                studentId,
                "Guardian unlinked: " + guardianId
        );
    }

    private StudentGuardianResponse findRelationship(
            UUID organizationId,
            UUID studentId,
            UUID guardianId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    sg.student_id,
                    sg.guardian_id,
                    g.guardian_number,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    g.phone,
                    sg.relationship_type,
                    sg.primary_contact,
                    sg.legal_guardian,
                    sg.pickup_authorized,
                    sg.receives_notifications,
                    sg.internal_media_consent,
                    sg.marketing_media_consent,
                    sg.consent_recorded_at,
                    sg.created_at,
                    sg.updated_at

                FROM student_guardians sg

                JOIN guardians g
                    ON g.id = sg.guardian_id
                   AND g.organization_id =
                       sg.organization_id

                JOIN organization_memberships om
                    ON om.id = g.membership_id
                   AND om.organization_id =
                       g.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE sg.organization_id = ?
                  AND sg.student_id = ?
                  AND sg.guardian_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapRelationship(resultSet),
                organizationId,
                studentId,
                guardianId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student guardian relationship "
                                + "was not found."
                )
        );
    }

    private void validateStudent(
            UUID organizationId,
            UUID studentId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM students
                WHERE id = ?
                  AND organization_id = ?
                  AND status <> 'ARCHIVED'
                """,
                Integer.class,
                studentId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }
    }

    private void validateGuardian(
            UUID organizationId,
            UUID guardianId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM guardians
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                guardianId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new ResourceNotFoundException(
                    "Guardian was not found."
            );
        }
    }

    private void ensureRelationshipDoesNotExist(
            UUID studentId,
            UUID guardianId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM student_guardians
                WHERE student_id = ?
                  AND guardian_id = ?
                """,
                Integer.class,
                studentId,
                guardianId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "This guardian is already linked "
                            + "to the student."
            );
        }
    }

    private void clearExistingPrimaryContact(
            UUID organizationId,
            UUID studentId
    ) {
        jdbcTemplate.update(
                """
                UPDATE student_guardians
                SET
                    primary_contact = FALSE,
                    updated_at = ?
                WHERE organization_id = ?
                  AND student_id = ?
                  AND primary_contact = TRUE
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                organizationId,
                studentId
        );
    }

    private boolean hasAnyConsent(
            SaveStudentGuardianRequest request
    ) {
        return request.internalMediaConsent()
                || request.marketingMediaConsent();
    }

    private StudentGuardianResponse mapRelationship(
            ResultSet resultSet
    ) throws SQLException {
        return new StudentGuardianResponse(
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "guardian_id",
                        UUID.class
                ),
                resultSet.getString(
                        "guardian_number"
                ),
                resultSet.getString("email"),
                resultSet.getString(
                        "display_first_name"
                ),
                resultSet.getString(
                        "display_last_name"
                ),
                resultSet.getString("phone"),
                GuardianRelationshipType.valueOf(
                        resultSet.getString(
                                "relationship_type"
                        )
                ),
                resultSet.getBoolean(
                        "primary_contact"
                ),
                resultSet.getBoolean(
                        "legal_guardian"
                ),
                resultSet.getBoolean(
                        "pickup_authorized"
                ),
                resultSet.getBoolean(
                        "receives_notifications"
                ),
                resultSet.getBoolean(
                        "internal_media_consent"
                ),
                resultSet.getBoolean(
                        "marketing_media_consent"
                ),
                resultSet.getObject(
                        "consent_recorded_at",
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
}
