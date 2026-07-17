package com.academy.platform.student;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
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
public class StudentService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public StudentService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> findStudents(
            UUID organizationId,
            String search,
            boolean includeArchived
    ) {
        String searchPattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    s.id,
                    s.branch_id,
                    b.name AS branch_name,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    s.birth_date,
                    s.gender,
                    s.status,
                    s.enrollment_date,
                    s.medical_notes,
                    s.allergies,
                    s.emergency_contact_name,
                    s.emergency_contact_phone,
                    s.notes,
                    s.created_at,
                    s.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM student_guardians sg
                        WHERE sg.student_id = s.id
                          AND sg.organization_id =
                              s.organization_id
                    ) AS guardian_count

                FROM students s

                LEFT JOIN branches b
                    ON b.id = s.branch_id
                   AND b.organization_id =
                       s.organization_id

                WHERE s.organization_id = ?
                  AND (
                      ? = TRUE
                      OR s.status <> 'ARCHIVED'
                  )
                  AND (
                      ? = '%%'
                      OR LOWER(s.student_number) LIKE ?
                      OR LOWER(s.first_name) LIKE ?
                      OR LOWER(s.last_name) LIKE ?
                      OR LOWER(
                          s.first_name || ' ' || s.last_name
                      ) LIKE ?
                  )

                ORDER BY
                    s.first_name,
                    s.last_name,
                    s.student_number
                """,
                (resultSet, rowNumber) ->
                        mapStudent(resultSet),
                organizationId,
                includeArchived,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern
        );
    }

    @Transactional(readOnly = true)
    public StudentResponse findStudent(
            UUID organizationId,
            UUID studentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    s.id,
                    s.branch_id,
                    b.name AS branch_name,
                    s.student_number,
                    s.first_name,
                    s.last_name,
                    s.birth_date,
                    s.gender,
                    s.status,
                    s.enrollment_date,
                    s.medical_notes,
                    s.allergies,
                    s.emergency_contact_name,
                    s.emergency_contact_phone,
                    s.notes,
                    s.created_at,
                    s.updated_at,

                    (
                        SELECT COUNT(*)
                        FROM student_guardians sg
                        WHERE sg.student_id = s.id
                          AND sg.organization_id =
                              s.organization_id
                    ) AS guardian_count

                FROM students s

                LEFT JOIN branches b
                    ON b.id = s.branch_id
                   AND b.organization_id =
                       s.organization_id

                WHERE s.id = ?
                  AND s.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapStudent(resultSet),
                studentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Student was not found."
                )
        );
    }

    @Transactional
    public StudentResponse createStudent(
            AuthenticatedUser actor,
            SaveStudentRequest request
    ) {
        validateRequest(request);

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureStudentNumberIsUnique(
                actor.organizationId(),
                null,
                request.studentNumber()
        );

        UUID studentId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO students
                (
                    id,
                    organization_id,
                    branch_id,
                    student_number,
                    first_name,
                    last_name,
                    birth_date,
                    gender,
                    status,
                    enrollment_date,
                    medical_notes,
                    allergies,
                    emergency_contact_name,
                    emergency_contact_phone,
                    notes,
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
                    'ACTIVE',
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
                studentId,
                actor.organizationId(),
                request.branchId(),
                normalizeStudentNumber(
                        request.studentNumber()
                ),
                request.firstName().trim(),
                request.lastName().trim(),
                request.birthDate(),
                enumName(request.gender()),
                request.enrollmentDate(),
                normalizeNullable(
                        request.medicalNotes()
                ),
                normalizeNullable(request.allergies()),
                normalizeNullable(
                        request.emergencyContactName()
                ),
                normalizeNullable(
                        request.emergencyContactPhone()
                ),
                normalizeNullable(request.notes()),
                now,
                now
        );

        auditService.record(
                actor,
                "STUDENT_CREATED",
                "STUDENT",
                studentId,
                "Student created with number "
                        + normalizeStudentNumber(
                                request.studentNumber()
                        )
        );

        return findStudent(
                actor.organizationId(),
                studentId
        );
    }

    @Transactional
    public StudentResponse updateStudent(
            AuthenticatedUser actor,
            UUID studentId,
            SaveStudentRequest request
    ) {
        findStudent(
                actor.organizationId(),
                studentId
        );

        validateRequest(request);

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureStudentNumberIsUnique(
                actor.organizationId(),
                studentId,
                request.studentNumber()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE students
                SET
                    branch_id = ?,
                    student_number = ?,
                    first_name = ?,
                    last_name = ?,
                    birth_date = ?,
                    gender = ?,
                    enrollment_date = ?,
                    medical_notes = ?,
                    allergies = ?,
                    emergency_contact_name = ?,
                    emergency_contact_phone = ?,
                    notes = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                request.branchId(),
                normalizeStudentNumber(
                        request.studentNumber()
                ),
                request.firstName().trim(),
                request.lastName().trim(),
                request.birthDate(),
                enumName(request.gender()),
                request.enrollmentDate(),
                normalizeNullable(
                        request.medicalNotes()
                ),
                normalizeNullable(request.allergies()),
                normalizeNullable(
                        request.emergencyContactName()
                ),
                normalizeNullable(
                        request.emergencyContactPhone()
                ),
                normalizeNullable(request.notes()),
                OffsetDateTime.now(ZoneOffset.UTC),
                studentId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Student was not found."
            );
        }

        auditService.record(
                actor,
                "STUDENT_UPDATED",
                "STUDENT",
                studentId,
                "Student profile updated."
        );

        return findStudent(
                actor.organizationId(),
                studentId
        );
    }

    @Transactional
    public void updateStatus(
            AuthenticatedUser actor,
            UUID studentId,
            StudentStatus newStatus
    ) {
        StudentResponse existing = findStudent(
                actor.organizationId(),
                studentId
        );

        if (existing.status() == newStatus) {
            return;
        }

        jdbcTemplate.update(
                """
                UPDATE students
                SET
                    status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                newStatus.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                studentId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "STUDENT_STATUS_UPDATED",
                "STUDENT",
                studentId,
                "Student status changed from "
                        + existing.status()
                        + " to " + newStatus
        );
    }

    private void validateRequest(
            SaveStudentRequest request
    ) {
        if (request.birthDate() != null
                && request.birthDate()
                .isAfter(LocalDate.now())) {
            throw new BusinessRuleException(
                    "Birth date cannot be in the future."
            );
        }
    }

    private void validateBranch(
            UUID organizationId,
            UUID branchId
    ) {
        if (branchId == null) {
            return;
        }

        Integer branchCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM branches
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                branchId,
                organizationId
        );

        if (branchCount == null || branchCount == 0) {
            throw new BusinessRuleException(
                    "The selected branch is invalid or inactive."
            );
        }
    }

    private void ensureStudentNumberIsUnique(
            UUID organizationId,
            UUID excludedStudentId,
            String studentNumber
    ) {
        Integer count;

        if (excludedStudentId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM students
                    WHERE organization_id = ?
                      AND LOWER(student_number) =
                          LOWER(?)
                    """,
                    Integer.class,
                    organizationId,
                    normalizeStudentNumber(studentNumber)
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM students
                    WHERE organization_id = ?
                      AND LOWER(student_number) =
                          LOWER(?)
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalizeStudentNumber(studentNumber),
                    excludedStudentId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A student with this student number "
                            + "already exists."
            );
        }
    }

    private StudentResponse mapStudent(
            ResultSet resultSet
    ) throws SQLException {
        String genderValue =
                resultSet.getString("gender");

        return new StudentResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "branch_id",
                        UUID.class
                ),
                resultSet.getString("branch_name"),
                resultSet.getString("student_number"),
                resultSet.getString("first_name"),
                resultSet.getString("last_name"),
                resultSet.getObject(
                        "birth_date",
                        LocalDate.class
                ),
                genderValue == null
                        ? null
                        : StudentGender.valueOf(
                                genderValue
                        ),
                StudentStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "enrollment_date",
                        LocalDate.class
                ),
                resultSet.getString("medical_notes"),
                resultSet.getString("allergies"),
                resultSet.getString(
                        "emergency_contact_name"
                ),
                resultSet.getString(
                        "emergency_contact_phone"
                ),
                resultSet.getString("notes"),
                resultSet.getInt("guardian_count"),
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

    private String normalizeStudentNumber(
            String studentNumber
    ) {
        return studentNumber
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return "%%";
        }

        return "%"
                + search.trim()
                .toLowerCase(Locale.ROOT)
                + "%";
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
