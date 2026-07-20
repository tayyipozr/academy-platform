package com.academy.platform.curriculumassignment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
public class GroupCurriculumAssignmentService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GroupCurriculumAssignmentService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<GroupCurriculumAssignmentResponse> findAssignments(
            UUID organizationId,
            UUID groupId,
            boolean includeHistory
    ) {
        findGroup(
                organizationId,
                groupId,
                false
        );

        return jdbcTemplate.query(
                """
                SELECT
                    gca.id,
                    gca.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    gca.curriculum_id,
                    c.code AS curriculum_code,
                    c.name AS curriculum_name,
                    c.version_label AS curriculum_version,
                    gca.status,
                    gca.start_date,
                    gca.end_date,
                    gca.end_reason,
                    gca.created_at,
                    gca.updated_at

                FROM group_curriculum_assignments gca

                JOIN academy_groups ag
                    ON ag.id = gca.group_id
                   AND ag.organization_id =
                       gca.organization_id

                JOIN curricula c
                    ON c.id = gca.curriculum_id
                   AND c.organization_id =
                       gca.organization_id

                WHERE gca.organization_id = ?
                  AND gca.group_id = ?
                  AND (
                      ? = TRUE
                      OR gca.status = 'ACTIVE'
                  )

                ORDER BY
                    CASE
                        WHEN gca.status = 'ACTIVE'
                        THEN 0
                        ELSE 1
                    END,
                    gca.start_date DESC,
                    gca.created_at DESC
                """,
                (resultSet, rowNumber) ->
                        mapAssignment(resultSet),
                organizationId,
                groupId,
                includeHistory
        );
    }

    @Transactional
    public GroupCurriculumProgressResponse assignCurriculum(
            AuthenticatedUser actor,
            UUID groupId,
            CreateGroupCurriculumAssignmentRequest request
    ) {
        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId,
                true
        );

        validateGroupStatus(group);
        validateAssignmentDate(
                group,
                request.startDate()
        );

        CurriculumRecord curriculum =
                findActiveCurriculum(
                        actor.organizationId(),
                        request.curriculumId()
                );

        validateProgramMatch(group, curriculum);

        ensureNoActiveAssignment(
                actor.organizationId(),
                groupId
        );

        UUID assignmentId = createAssignment(
                actor,
                groupId,
                request.curriculumId(),
                request.startDate()
        );

        initializeUnitProgress(
                actor.organizationId(),
                assignmentId,
                request.curriculumId()
        );

        auditService.record(
                actor,
                "CURRICULUM_ASSIGNED_TO_GROUP",
                "GROUP_CURRICULUM_ASSIGNMENT",
                assignmentId,
                "Curriculum "
                        + request.curriculumId()
                        + " assigned to group "
                        + groupId
        );

        return findProgress(
                actor.organizationId(),
                groupId,
                assignmentId
        );
    }

    @Transactional
    public GroupCurriculumProgressResponse replaceCurriculum(
            AuthenticatedUser actor,
            UUID groupId,
            ReplaceGroupCurriculumRequest request
    ) {
        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId,
                true
        );

        validateGroupStatus(group);
        validateAssignmentDate(
                group,
                request.replacementDate()
        );

        CurriculumRecord curriculum =
                findActiveCurriculum(
                        actor.organizationId(),
                        request.curriculumId()
                );

        validateProgramMatch(group, curriculum);

        AssignmentRecord current =
                findActiveAssignmentForUpdate(
                        actor.organizationId(),
                        groupId
                );

        if (current.curriculumId()
                .equals(request.curriculumId())) {
            throw new ConflictException(
                    "The selected curriculum is already "
                            + "assigned to this group."
            );
        }

        if (request.replacementDate()
                .isBefore(current.startDate())) {
            throw new BusinessRuleException(
                    "Replacement date cannot be before "
                            + "the current assignment start date."
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE group_curriculum_assignments
                SET
                    status = 'ENDED',
                    end_date = ?,
                    end_reason = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                request.replacementDate(),
                normalizeNullable(request.reason()),
                now,
                current.id(),
                actor.organizationId()
        );

        UUID newAssignmentId = createAssignment(
                actor,
                groupId,
                request.curriculumId(),
                request.replacementDate()
        );

        initializeUnitProgress(
                actor.organizationId(),
                newAssignmentId,
                request.curriculumId()
        );

        auditService.record(
                actor,
                "GROUP_CURRICULUM_REPLACED",
                "GROUP_CURRICULUM_ASSIGNMENT",
                newAssignmentId,
                "Curriculum assignment "
                        + current.id()
                        + " replaced by "
                        + newAssignmentId
        );

        return findProgress(
                actor.organizationId(),
                groupId,
                newAssignmentId
        );
    }

    @Transactional
    public GroupCurriculumAssignmentResponse endAssignment(
            AuthenticatedUser actor,
            UUID groupId,
            UUID assignmentId,
            EndGroupCurriculumAssignmentRequest request
    ) {
        if (request.status()
                == GroupCurriculumAssignmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "An assignment cannot be ended with "
                            + "ACTIVE status."
            );
        }

        GroupCurriculumAssignmentResponse existing =
                findAssignment(
                        actor.organizationId(),
                        assignmentId
                );

        if (!existing.groupId().equals(groupId)) {
            throw new ResourceNotFoundException(
                    "Curriculum assignment was not found "
                            + "in this group."
            );
        }

        if (existing.status()
                != GroupCurriculumAssignmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "Only an active curriculum assignment "
                            + "can be ended."
            );
        }

        if (request.endDate()
                .isBefore(existing.startDate())) {
            throw new BusinessRuleException(
                    "Assignment end date cannot be before "
                            + "its start date."
            );
        }

        GroupRecord group = findGroup(
                actor.organizationId(),
                groupId,
                false
        );

        if (request.endDate()
                .isAfter(group.termEndDate())) {
            throw new BusinessRuleException(
                    "Assignment end date cannot be after "
                            + "the term end date."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE group_curriculum_assignments
                SET
                    status = ?,
                    end_date = ?,
                    end_reason = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                """,
                request.status().name(),
                request.endDate(),
                normalizeNullable(request.reason()),
                OffsetDateTime.now(ZoneOffset.UTC),
                assignmentId,
                actor.organizationId(),
                groupId
        );

        auditService.record(
                actor,
                "GROUP_CURRICULUM_ASSIGNMENT_ENDED",
                "GROUP_CURRICULUM_ASSIGNMENT",
                assignmentId,
                "Assignment status changed to "
                        + request.status()
        );

        return findAssignment(
                actor.organizationId(),
                assignmentId
        );
    }

    @Transactional(readOnly = true)
    public GroupCurriculumProgressResponse findActiveProgress(
            UUID organizationId,
            UUID groupId
    ) {
        AssignmentRecord assignment =
                findActiveAssignment(
                        organizationId,
                        groupId
                );

        return findProgress(
                organizationId,
                groupId,
                assignment.id()
        );
    }

    @Transactional(readOnly = true)
    public GroupCurriculumProgressResponse findProgress(
            UUID organizationId,
            UUID groupId,
            UUID assignmentId
    ) {
        GroupCurriculumAssignmentResponse assignment =
                findAssignment(
                        organizationId,
                        assignmentId
                );

        if (!assignment.groupId().equals(groupId)) {
            throw new ResourceNotFoundException(
                    "Curriculum assignment was not found "
                            + "in this group."
            );
        }

        List<CurriculumUnitProgressResponse> units =
                jdbcTemplate.query(
                        """
                        SELECT
                            gcup.id,
                            gcup.assignment_id,
                            gcup.unit_id,
                            cu.parent_unit_id,
                            cu.code AS unit_code,
                            cu.title AS unit_title,
                            cu.sequence_number,
                            cu.estimated_sessions,
                            gcup.status,
                            gcup.completed_sessions,
                            gcup.completed_at,
                            gcup.created_at,
                            gcup.updated_at

                        FROM group_curriculum_unit_progress gcup

                        JOIN curriculum_units cu
                            ON cu.id = gcup.unit_id
                           AND cu.curriculum_id =
                               gcup.curriculum_id
                           AND cu.organization_id =
                               gcup.organization_id

                        WHERE gcup.organization_id = ?
                          AND gcup.assignment_id = ?

                        ORDER BY cu.sequence_number
                        """,
                        (resultSet, rowNumber) ->
                                mapProgress(resultSet),
                        organizationId,
                        assignmentId
                );

        int totalUnits = units.size();

        int notStarted = (int) units.stream()
                .filter(unit ->
                        unit.status()
                                == CurriculumUnitProgressStatus
                                .NOT_STARTED
                )
                .count();

        int inProgress = (int) units.stream()
                .filter(unit ->
                        unit.status()
                                == CurriculumUnitProgressStatus
                                .IN_PROGRESS
                )
                .count();

        int completed = (int) units.stream()
                .filter(unit ->
                        unit.status()
                                == CurriculumUnitProgressStatus
                                .COMPLETED
                )
                .count();

        int estimatedSessions = units.stream()
                .map(CurriculumUnitProgressResponse
                        ::estimatedSessions)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .sum();

        int completedSessions = units.stream()
                .mapToInt(
                        CurriculumUnitProgressResponse
                                ::completedSessions
                )
                .sum();

        double percentage = totalUnits == 0
                ? 0.0
                : Math.round(
                        (
                                (double) completed
                                        / totalUnits
                        ) * 10000.0
                ) / 100.0;

        return new GroupCurriculumProgressResponse(
                assignment,
                totalUnits,
                notStarted,
                inProgress,
                completed,
                estimatedSessions,
                completedSessions,
                percentage,
                units
        );
    }

    @Transactional
    public CurriculumUnitProgressResponse updateUnitProgress(
            AuthenticatedUser actor,
            UUID groupId,
            UUID assignmentId,
            UUID unitId,
            UpdateCurriculumUnitProgressRequest request
    ) {
        GroupCurriculumAssignmentResponse assignment =
                findAssignment(
                        actor.organizationId(),
                        assignmentId
                );

        if (!assignment.groupId().equals(groupId)) {
            throw new ResourceNotFoundException(
                    "Curriculum assignment was not found "
                            + "in this group."
            );
        }

        if (assignment.status()
                != GroupCurriculumAssignmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "Progress can only be updated for "
                            + "an active curriculum assignment."
            );
        }

        CurriculumUnitProgressResponse existing =
                findUnitProgress(
                        actor.organizationId(),
                        assignmentId,
                        unitId
                );

        validateProgressRequest(request);

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        OffsetDateTime completedAt =
                request.status()
                        == CurriculumUnitProgressStatus
                        .COMPLETED
                        ? existing.completedAt() == null
                            ? now
                            : existing.completedAt()
                        : null;

        jdbcTemplate.update(
                """
                UPDATE group_curriculum_unit_progress
                SET
                    status = ?,
                    completed_sessions = ?,
                    completed_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE organization_id = ?
                  AND assignment_id = ?
                  AND unit_id = ?
                """,
                request.status().name(),
                request.completedSessions(),
                completedAt,
                now,
                actor.organizationId(),
                assignmentId,
                unitId
        );

        auditService.record(
                actor,
                "CURRICULUM_UNIT_PROGRESS_UPDATED",
                "GROUP_CURRICULUM_UNIT_PROGRESS",
                existing.id(),
                "Unit status changed to "
                        + request.status()
                        + " with "
                        + request.completedSessions()
                        + " completed sessions."
        );

        return findUnitProgress(
                actor.organizationId(),
                assignmentId,
                unitId
        );
    }

    private UUID createAssignment(
            AuthenticatedUser actor,
            UUID groupId,
            UUID curriculumId,
            LocalDate startDate
    ) {
        UUID assignmentId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO group_curriculum_assignments
                (
                    id,
                    organization_id,
                    group_id,
                    curriculum_id,
                    status,
                    start_date,
                    end_date,
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
                assignmentId,
                actor.organizationId(),
                groupId,
                curriculumId,
                startDate,
                actor.userId(),
                now,
                now
        );

        return assignmentId;
    }

    private void initializeUnitProgress(
            UUID organizationId,
            UUID assignmentId,
            UUID curriculumId
    ) {
        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO group_curriculum_unit_progress
                (
                    id,
                    organization_id,
                    assignment_id,
                    curriculum_id,
                    unit_id,
                    status,
                    completed_sessions,
                    completed_at,
                    created_at,
                    updated_at,
                    version
                )
                SELECT
                    gen_random_uuid(),
                    cu.organization_id,
                    ?,
                    cu.curriculum_id,
                    cu.id,
                    'NOT_STARTED',
                    0,
                    NULL,
                    ?,
                    ?,
                    0
                FROM curriculum_units cu
                WHERE cu.organization_id = ?
                  AND cu.curriculum_id = ?
                """,
                assignmentId,
                now,
                now,
                organizationId,
                curriculumId
        );
    }

    private GroupCurriculumAssignmentResponse findAssignment(
            UUID organizationId,
            UUID assignmentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    gca.id,
                    gca.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    gca.curriculum_id,
                    c.code AS curriculum_code,
                    c.name AS curriculum_name,
                    c.version_label AS curriculum_version,
                    gca.status,
                    gca.start_date,
                    gca.end_date,
                    gca.end_reason,
                    gca.created_at,
                    gca.updated_at

                FROM group_curriculum_assignments gca

                JOIN academy_groups ag
                    ON ag.id = gca.group_id
                   AND ag.organization_id =
                       gca.organization_id

                JOIN curricula c
                    ON c.id = gca.curriculum_id
                   AND c.organization_id =
                       gca.organization_id

                WHERE gca.id = ?
                  AND gca.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapAssignment(resultSet),
                assignmentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Curriculum assignment was not found."
                )
        );
    }

    private CurriculumUnitProgressResponse findUnitProgress(
            UUID organizationId,
            UUID assignmentId,
            UUID unitId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    gcup.id,
                    gcup.assignment_id,
                    gcup.unit_id,
                    cu.parent_unit_id,
                    cu.code AS unit_code,
                    cu.title AS unit_title,
                    cu.sequence_number,
                    cu.estimated_sessions,
                    gcup.status,
                    gcup.completed_sessions,
                    gcup.completed_at,
                    gcup.created_at,
                    gcup.updated_at

                FROM group_curriculum_unit_progress gcup

                JOIN curriculum_units cu
                    ON cu.id = gcup.unit_id
                   AND cu.curriculum_id =
                       gcup.curriculum_id
                   AND cu.organization_id =
                       gcup.organization_id

                WHERE gcup.organization_id = ?
                  AND gcup.assignment_id = ?
                  AND gcup.unit_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapProgress(resultSet),
                organizationId,
                assignmentId,
                unitId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Curriculum unit progress was not found."
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
                    ag.program_id,
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
                                resultSet.getObject(
                                        "program_id",
                                        UUID.class
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

    private CurriculumRecord findActiveCurriculum(
            UUID organizationId,
            UUID curriculumId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id, program_id
                FROM curricula
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                """,
                (resultSet, rowNumber) ->
                        new CurriculumRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "program_id",
                                        UUID.class
                                )
                        ),
                curriculumId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The selected curriculum is invalid "
                                + "or inactive."
                )
        );
    }

    private AssignmentRecord findActiveAssignment(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id, curriculum_id, start_date
                FROM group_curriculum_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                """,
                (resultSet, rowNumber) ->
                        new AssignmentRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "curriculum_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "start_date",
                                        LocalDate.class
                                )
                        ),
                organizationId,
                groupId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "The group has no active "
                                + "curriculum assignment."
                )
        );
    }

    private AssignmentRecord findActiveAssignmentForUpdate(
            UUID organizationId,
            UUID groupId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id, curriculum_id, start_date
                FROM group_curriculum_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                FOR UPDATE
                """,
                (resultSet, rowNumber) ->
                        new AssignmentRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "curriculum_id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "start_date",
                                        LocalDate.class
                                )
                        ),
                organizationId,
                groupId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "The group has no active "
                                + "curriculum assignment."
                )
        );
    }

    private void validateGroupStatus(GroupRecord group) {
        if (!group.status().equals("DRAFT")
                && !group.status().equals("ACTIVE")) {
            throw new BusinessRuleException(
                    "A curriculum can only be assigned to "
                            + "a draft or active group."
            );
        }
    }

    private void validateAssignmentDate(
            GroupRecord group,
            LocalDate date
    ) {
        if (date.isBefore(group.termStartDate())
                || date.isAfter(group.termEndDate())) {
            throw new BusinessRuleException(
                    "Assignment date must be within "
                            + "the group's term."
            );
        }
    }

    private void validateProgramMatch(
            GroupRecord group,
            CurriculumRecord curriculum
    ) {
        if (!group.programId()
                .equals(curriculum.programId())) {
            throw new BusinessRuleException(
                    "The curriculum program does not match "
                            + "the group program."
            );
        }
    }

    private void ensureNoActiveAssignment(
            UUID organizationId,
            UUID groupId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_curriculum_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                organizationId,
                groupId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "The group already has an active "
                            + "curriculum assignment."
            );
        }
    }

    private void validateProgressRequest(
            UpdateCurriculumUnitProgressRequest request
    ) {
        if (request.status()
                == CurriculumUnitProgressStatus.NOT_STARTED
                && request.completedSessions() != 0) {
            throw new BusinessRuleException(
                    "A not-started unit must have zero "
                            + "completed sessions."
            );
        }

        if (
                (
                        request.status()
                                == CurriculumUnitProgressStatus
                                .IN_PROGRESS
                        || request.status()
                                == CurriculumUnitProgressStatus
                                .COMPLETED
                )
                && request.completedSessions() == 0
        ) {
            throw new BusinessRuleException(
                    "An in-progress or completed unit must "
                            + "have at least one completed session."
            );
        }
    }

    private GroupCurriculumAssignmentResponse mapAssignment(
            ResultSet resultSet
    ) throws SQLException {
        return new GroupCurriculumAssignmentResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "curriculum_id",
                        UUID.class
                ),
                resultSet.getString("curriculum_code"),
                resultSet.getString("curriculum_name"),
                resultSet.getString(
                        "curriculum_version"
                ),
                GroupCurriculumAssignmentStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getObject(
                        "start_date",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "end_date",
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

    private CurriculumUnitProgressResponse mapProgress(
            ResultSet resultSet
    ) throws SQLException {
        return new CurriculumUnitProgressResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "assignment_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "unit_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "parent_unit_id",
                        UUID.class
                ),
                resultSet.getString("unit_code"),
                resultSet.getString("unit_title"),
                resultSet.getInt("sequence_number"),
                resultSet.getObject(
                        "estimated_sessions",
                        Integer.class
                ),
                CurriculumUnitProgressStatus.valueOf(
                        resultSet.getString("status")
                ),
                resultSet.getInt(
                        "completed_sessions"
                ),
                resultSet.getObject(
                        "completed_at",
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record GroupRecord(
            UUID id,
            UUID programId,
            String status,
            LocalDate termStartDate,
            LocalDate termEndDate
    ) {
    }

    private record CurriculumRecord(
            UUID id,
            UUID programId
    ) {
    }

    private record AssignmentRecord(
            UUID id,
            UUID curriculumId,
            LocalDate startDate
    ) {
    }
}
