package com.academy.platform.enrollment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupEnrollmentService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GroupEnrollmentService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public GroupEnrollmentSummaryResponse findEnrollments(
            UUID organizationId,
            UUID groupId,
            boolean includeHistory
    ) {
        GroupRecord group = findGroup(
                organizationId,
                groupId,
                false
        );

        List<EnrollmentResponse> enrollments =
                jdbcTemplate.query(
                        """
                        SELECT
                            ge.id,
                            ge.group_id,
                            ag.code AS group_code,
                            ag.name AS group_name,
                            ge.student_id,
                            s.student_number,
                            s.first_name,
                            s.last_name,
                            s.birth_date,
                            ge.status,
                            ge.enrolled_at,
                            ge.ended_at,
                            ge.end_reason,
                            ge.created_at,
                            ge.updated_at

                        FROM group_enrollments ge

                        JOIN academy_groups ag
                            ON ag.id = ge.group_id
                           AND ag.organization_id =
                               ge.organization_id

                        JOIN students s
                            ON s.id = ge.student_id
                           AND s.organization_id =
                               ge.organization_id

                        WHERE ge.organization_id = ?
                          AND ge.group_id = ?
                          AND (
                              ? = TRUE
                              OR ge.status = 'ACTIVE'
                          )

                        ORDER BY
                            CASE
                                WHEN ge.status = 'ACTIVE'
                                THEN 0
                                ELSE 1
                            END,
                            s.first_name,
                            s.last_name,
                            ge.enrolled_at DESC
                        """,
                        (resultSet, rowNumber) ->
                                mapEnrollment(resultSet),
                        organizationId,
                        groupId,
                        includeHistory
                );

        long activeCount = enrollments.stream()
                .filter(enrollment ->
                        enrollment.status()
                                == EnrollmentStatus.ACTIVE
                )
                .count();

        int availablePlaces = Math.max(
                group.capacity() - (int) activeCount,
                0
        );

        return new GroupEnrollmentSummaryResponse(
                group.id(),
                group.capacity(),
                activeCount,
                availablePlaces,
                enrollments
        );
    }

    @Transactional
    public EnrollmentResponse enrollStudent(
            AuthenticatedUser actor,
            UUID groupId,
            CreateEnrollmentRequest request
    ) {
        /*
         * Lock the group record so concurrent enrollment
         * requests cannot exceed its capacity.
         */
        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId,
                true
        );

        validateGroupAvailable(group);
        validateEnrollmentDate(group, request.enrolledAt());

        StudentRecord student = findStudent(
                actor.organizationId(),
                request.studentId()
        );

        ensureNoActiveEnrollment(
                actor.organizationId(),
                groupId,
                request.studentId()
        );

        validateStudentAge(
                group,
                student
        );

        long activeEnrollmentCount =
                countActiveEnrollments(
                        actor.organizationId(),
                        groupId
                );

        if (activeEnrollmentCount >= group.capacity()) {
            throw new BusinessRuleException(
                    "The group has reached its maximum capacity."
            );
        }

        UUID enrollmentId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO group_enrollments
                (
                    id,
                    organization_id,
                    group_id,
                    student_id,
                    status,
                    enrolled_at,
                    ended_at,
                    end_reason,
                    created_by,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    ?,
                    NULL,
                    NULL,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                enrollmentId,
                actor.organizationId(),
                groupId,
                request.studentId(),
                request.enrolledAt(),
                actor.userId(),
                now,
                now
        );

        auditService.record(
                actor,
                "STUDENT_ENROLLED_IN_GROUP",
                "GROUP_ENROLLMENT",
                enrollmentId,
                "Student "
                        + request.studentId()
                        + " enrolled in group "
                        + groupId
        );

        return findEnrollment(
                actor.organizationId(),
                enrollmentId
        );
    }

    @Transactional
    public EnrollmentResponse endEnrollment(
            AuthenticatedUser actor,
            UUID groupId,
            UUID enrollmentId,
            EndEnrollmentRequest request
    ) {
        if (request.status() == EnrollmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "An enrollment cannot be ended with "
                            + "ACTIVE status."
            );
        }

        EnrollmentResponse existing = findEnrollment(
                actor.organizationId(),
                enrollmentId
        );

        if (!existing.groupId().equals(groupId)) {
            throw new ResourceNotFoundException(
                    "Enrollment was not found in this group."
            );
        }

        if (existing.status() != EnrollmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "Only an active enrollment can be ended."
            );
        }

        if (request.endedAt()
                .isBefore(existing.enrolledAt())) {
            throw new BusinessRuleException(
                    "Enrollment end date cannot be before "
                            + "the enrollment date."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE group_enrollments
                SET
                    status = ?,
                    ended_at = ?,
                    end_reason = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                """,
                request.status().name(),
                request.endedAt(),
                normalizeNullable(request.reason()),
                OffsetDateTime.now(ZoneOffset.UTC),
                enrollmentId,
                actor.organizationId(),
                groupId
        );

        auditService.record(
                actor,
                "GROUP_ENROLLMENT_ENDED",
                "GROUP_ENROLLMENT",
                enrollmentId,
                "Enrollment status changed to "
                        + request.status()
        );

        return findEnrollment(
                actor.organizationId(),
                enrollmentId
        );
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse findEnrollment(
            UUID organizationId,
            UUID enrollmentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    ge.id,
                    ge.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    ge.student_id,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    s.birth_date,
                    ge.status,
                    ge.enrolled_at,
                    ge.ended_at,
                    ge.end_reason,
                    ge.created_at,
                    ge.updated_at

                FROM group_enrollments ge

                JOIN academy_groups ag
                    ON ag.id = ge.group_id
                   AND ag.organization_id =
                       ge.organization_id

                JOIN students s
                    ON s.id = ge.student_id
                   AND s.organization_id =
                       ge.organization_id

                WHERE ge.id = ?
                  AND ge.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapEnrollment(resultSet),
                enrollmentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Enrollment was not found."
                )
        );
    }

    private GroupRecord findGroup(
            UUID organizationId,
            UUID groupId,
            boolean lockForUpdate
    ) {
        String sql = """
                SELECT
                    ag.id,
                    ag.capacity,
                    ag.minimum_age,
                    ag.maximum_age,
                    ag.status,
                    ot.start_date AS term_start_date,
                    ot.end_date AS term_end_date

                FROM academy_groups ag

                JOIN operational_terms ot
                    ON ot.id = ag.term_id
                   AND ot.organization_id =
                       ag.organization_id

                WHERE ag.id = ?
                  AND ag.organization_id = ?
                """
                + (lockForUpdate ? " FOR UPDATE" : "");

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) ->
                        new GroupRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getInt("capacity"),
                                resultSet.getObject(
                                        "minimum_age",
                                        Integer.class
                                ),
                                resultSet.getObject(
                                        "maximum_age",
                                        Integer.class
                                ),
                                resultSet.getString("status"),
                                resultSet.getObject(
                                        "term_start_date",
                                        LocalDate.class
                                ),
                                resultSet.getObject(
                                        "term_end_date",
                                        LocalDate.class
                                )
                        ),
                groupId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Group was not found."
                )
        );
    }

    private StudentRecord findStudent(
            UUID organizationId,
            UUID studentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    birth_date
                FROM students
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                (resultSet, rowNumber) ->
                        new StudentRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "birth_date",
                                        LocalDate.class
                                )
                        ),
                studentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The selected student is invalid "
                                + "or inactive."
                )
        );
    }

    private void validateGroupAvailable(
            GroupRecord group
    ) {
        if (!group.status().equals("DRAFT")
                && !group.status().equals("ACTIVE")) {
            throw new BusinessRuleException(
                    "Students can only be enrolled in "
                            + "draft or active groups."
            );
        }
    }

    private void validateEnrollmentDate(
            GroupRecord group,
            LocalDate enrollmentDate
    ) {
        if (enrollmentDate.isAfter(group.termEndDate())) {
            throw new BusinessRuleException(
                    "Enrollment date cannot be after "
                            + "the term end date."
            );
        }
    }

    private void validateStudentAge(
            GroupRecord group,
            StudentRecord student
    ) {
        if (group.minimumAge() == null
                && group.maximumAge() == null) {
            return;
        }

        if (student.birthDate() == null) {
            throw new BusinessRuleException(
                    "The student's birth date is required "
                            + "to validate the group age range."
            );
        }

        int ageAtTermStart = Period.between(
                student.birthDate(),
                group.termStartDate()
        ).getYears();

        if (ageAtTermStart < 0) {
            throw new BusinessRuleException(
                    "The student's birth date is invalid "
                            + "for the selected term."
            );
        }

        if (group.minimumAge() != null
                && ageAtTermStart
                < group.minimumAge()) {
            throw new BusinessRuleException(
                    "The student is younger than the "
                            + "group minimum age."
            );
        }

        if (group.maximumAge() != null
                && ageAtTermStart
                > group.maximumAge()) {
            throw new BusinessRuleException(
                    "The student is older than the "
                            + "group maximum age."
            );
        }
    }

    private void ensureNoActiveEnrollment(
            UUID organizationId,
            UUID groupId,
            UUID studentId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_enrollments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND student_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                organizationId,
                groupId,
                studentId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "The student is already actively "
                            + "enrolled in this group."
            );
        }
    }

    private long countActiveEnrollments(
            UUID organizationId,
            UUID groupId
    ) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_enrollments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                """,
                Long.class,
                organizationId,
                groupId
        );

        return count == null ? 0 : count;
    }

    private EnrollmentResponse mapEnrollment(
            ResultSet resultSet
    ) throws SQLException {
        return new EnrollmentResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "student_id",
                        UUID.class
                ),
                resultSet.getString(
                        "student_number"
                ),
                resultSet.getString("first_name"),
                resultSet.getString("last_name"),
                resultSet.getObject(
                        "birth_date",
                        LocalDate.class
                ),
                EnrollmentStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "enrolled_at",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "ended_at",
                        LocalDate.class
                ),
                resultSet.getString("end_reason"),
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record GroupRecord(
            UUID id,
            int capacity,
            Integer minimumAge,
            Integer maximumAge,
            String status,
            LocalDate termStartDate,
            LocalDate termEndDate
    ) {
    }

    private record StudentRecord(
            UUID id,
            LocalDate birthDate
    ) {
    }
}
