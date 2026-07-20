package com.academy.platform.groupassignment;

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
public class GroupStaffAssignmentService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public GroupStaffAssignmentService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<GroupStaffAssignmentResponse> findAssignments(
            UUID organizationId,
            UUID groupId,
            boolean includeHistory
    ) {
        validateGroup(
                organizationId,
                groupId,
                false
        );

        return jdbcTemplate.query(
                """
                SELECT
                    gsa.id,
                    gsa.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    gsa.staff_id,
                    sm.staff_number,
                    om.display_first_name,
                    om.display_last_name,
                    u.email,
                    sm.title,
                    sm.specialization,
                    gsa.assignment_role,
                    gsa.status,
                    gsa.start_date,
                    gsa.end_date,
                    gsa.end_reason,
                    gsa.created_at,
                    gsa.updated_at

                FROM group_staff_assignments gsa

                JOIN academy_groups ag
                    ON ag.id = gsa.group_id
                   AND ag.organization_id =
                       gsa.organization_id

                JOIN staff_members sm
                    ON sm.id = gsa.staff_id
                   AND sm.organization_id =
                       gsa.organization_id

                JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE gsa.organization_id = ?
                  AND gsa.group_id = ?
                  AND (
                      ? = TRUE
                      OR gsa.status = 'ACTIVE'
                  )

                ORDER BY
                    CASE gsa.assignment_role
                        WHEN 'PRIMARY_INSTRUCTOR' THEN 0
                        ELSE 1
                    END,
                    CASE
                        WHEN gsa.status = 'ACTIVE' THEN 0
                        ELSE 1
                    END,
                    om.display_first_name,
                    om.display_last_name
                """,
                (resultSet, rowNumber) ->
                        mapAssignment(resultSet),
                organizationId,
                groupId,
                includeHistory
        );
    }

    @Transactional
    public GroupStaffAssignmentResponse assignStaff(
            AuthenticatedUser actor,
            UUID groupId,
            CreateGroupStaffAssignmentRequest request
    ) {
        GroupRecord group = validateGroup(
                actor.organizationId(),
                groupId,
                true
        );

        validateStaff(
                actor.organizationId(),
                request.staffId()
        );

        validateStartDate(
                group,
                request.startDate()
        );

        ensureNoActiveAssignment(
                actor.organizationId(),
                groupId,
                request.staffId()
        );

        if (request.assignmentRole()
                == GroupStaffRole.PRIMARY_INSTRUCTOR) {
            ensureNoActivePrimaryInstructor(
                    actor.organizationId(),
                    groupId
            );
        }

        UUID assignmentId = UUID.randomUUID();

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO group_staff_assignments
                (
                    id,
                    organization_id,
                    group_id,
                    staff_id,
                    assignment_role,
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
                request.staffId(),
                request.assignmentRole().name(),
                request.startDate(),
                actor.userId(),
                now,
                now
        );

        auditService.record(
                actor,
                "STAFF_ASSIGNED_TO_GROUP",
                "GROUP_STAFF_ASSIGNMENT",
                assignmentId,
                request.assignmentRole()
                        + " assigned to group "
                        + groupId
        );

        return findAssignment(
                actor.organizationId(),
                assignmentId
        );
    }

    @Transactional
    public GroupStaffAssignmentResponse endAssignment(
            AuthenticatedUser actor,
            UUID groupId,
            UUID assignmentId,
            EndGroupStaffAssignmentRequest request
    ) {
        if (request.status()
                == GroupStaffAssignmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "An assignment cannot be ended with "
                            + "ACTIVE status."
            );
        }

        GroupStaffAssignmentResponse existing =
                findAssignment(
                        actor.organizationId(),
                        assignmentId
                );

        if (!existing.groupId().equals(groupId)) {
            throw new ResourceNotFoundException(
                    "Staff assignment was not found "
                            + "in this group."
            );
        }

        if (existing.status()
                != GroupStaffAssignmentStatus.ACTIVE) {
            throw new BusinessRuleException(
                    "Only an active staff assignment "
                            + "can be ended."
            );
        }

        if (request.endDate()
                .isBefore(existing.startDate())) {
            throw new BusinessRuleException(
                    "Assignment end date cannot be before "
                            + "the start date."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE group_staff_assignments
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
                "GROUP_STAFF_ASSIGNMENT_ENDED",
                "GROUP_STAFF_ASSIGNMENT",
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
    public GroupStaffAssignmentResponse findAssignment(
            UUID organizationId,
            UUID assignmentId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    gsa.id,
                    gsa.group_id,
                    ag.code AS group_code,
                    ag.name AS group_name,
                    gsa.staff_id,
                    sm.staff_number,
                    om.display_first_name,
                    om.display_last_name,
                    u.email,
                    sm.title,
                    sm.specialization,
                    gsa.assignment_role,
                    gsa.status,
                    gsa.start_date,
                    gsa.end_date,
                    gsa.end_reason,
                    gsa.created_at,
                    gsa.updated_at

                FROM group_staff_assignments gsa

                JOIN academy_groups ag
                    ON ag.id = gsa.group_id
                   AND ag.organization_id =
                       gsa.organization_id

                JOIN staff_members sm
                    ON sm.id = gsa.staff_id
                   AND sm.organization_id =
                       gsa.organization_id

                JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                JOIN users u
                    ON u.id = om.user_id

                WHERE gsa.id = ?
                  AND gsa.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        mapAssignment(resultSet),
                assignmentId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Staff assignment was not found."
                )
        );
    }

    private GroupRecord validateGroup(
            UUID organizationId,
            UUID groupId,
            boolean lockForUpdate
    ) {
        String sql = """
                SELECT
                    ag.id,
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

        GroupRecord group = jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) ->
                        new GroupRecord(
                                resultSet.getObject(
                                        "id",
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

        if (!group.status().equals("DRAFT")
                && !group.status().equals("ACTIVE")) {
            throw new BusinessRuleException(
                    "Staff can only be assigned to "
                            + "draft or active groups."
            );
        }

        return group;
    }

    private void validateStaff(
            UUID organizationId,
            UUID staffId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM staff_members sm

                JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                WHERE sm.id = ?
                  AND sm.organization_id = ?
                  AND sm.employment_status = 'ACTIVE'
                  AND om.status = 'ACTIVE'
                """,
                Integer.class,
                staffId,
                organizationId
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected staff member is invalid "
                            + "or inactive."
            );
        }
    }

    private void validateStartDate(
            GroupRecord group,
            LocalDate startDate
    ) {
        if (startDate.isAfter(group.termEndDate())) {
            throw new BusinessRuleException(
                    "Assignment start date cannot be after "
                            + "the term end date."
            );
        }
    }

    private void ensureNoActiveAssignment(
            UUID organizationId,
            UUID groupId,
            UUID staffId
    ) {
        Integer count = jdbcTemplate.queryForObject(
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

        if (count != null && count > 0) {
            throw new ConflictException(
                    "This staff member is already actively "
                            + "assigned to the group."
            );
        }
    }

    private void ensureNoActivePrimaryInstructor(
            UUID organizationId,
            UUID groupId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM group_staff_assignments
                WHERE organization_id = ?
                  AND group_id = ?
                  AND assignment_role =
                      'PRIMARY_INSTRUCTOR'
                  AND status = 'ACTIVE'
                """,
                Integer.class,
                organizationId,
                groupId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "The group already has an active "
                            + "primary instructor."
            );
        }
    }

    private GroupStaffAssignmentResponse mapAssignment(
            ResultSet resultSet
    ) throws SQLException {
        return new GroupStaffAssignmentResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "group_id",
                        UUID.class
                ),
                resultSet.getString("group_code"),
                resultSet.getString("group_name"),
                resultSet.getObject(
                        "staff_id",
                        UUID.class
                ),
                resultSet.getString("staff_number"),
                resultSet.getString(
                        "display_first_name"
                ),
                resultSet.getString(
                        "display_last_name"
                ),
                resultSet.getString("email"),
                resultSet.getString("title"),
                resultSet.getString("specialization"),
                GroupStaffRole.valueOf(
                        resultSet.getString(
                                "assignment_role"
                        )
                ),
                GroupStaffAssignmentStatus.valueOf(
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record GroupRecord(
            UUID id,
            String status,
            LocalDate termStartDate,
            LocalDate termEndDate
    ) {
    }
}
