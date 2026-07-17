package com.academy.platform.staff;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
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
public class StaffService {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public StaffService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StaffResponse> findStaff(
            UUID organizationId,
            String search,
            boolean includeArchived
    ) {
        String pattern = normalizeSearch(search);

        return jdbcTemplate.query(
                """
                SELECT
                    sm.id,
                    sm.membership_id,
                    om.user_id,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    sm.branch_id,
                    b.name AS branch_name,
                    sm.staff_number,
                    sm.title,
                    sm.specialization,
                    sm.employment_status,
                    sm.biography,
                    sm.hired_at,
                    sm.ended_at,
                    sm.created_at,
                    sm.updated_at

                FROM staff_members sm

                JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                JOIN users u
                    ON u.id = om.user_id

                LEFT JOIN branches b
                    ON b.id = sm.branch_id
                   AND b.organization_id =
                       sm.organization_id

                WHERE sm.organization_id = ?
                  AND (
                      ? = TRUE
                      OR sm.employment_status <> 'ARCHIVED'
                  )
                  AND (
                      ? = '%%'
                      OR LOWER(u.email) LIKE ?
                      OR LOWER(sm.staff_number) LIKE ?
                      OR LOWER(
                          om.display_first_name
                      ) LIKE ?
                      OR LOWER(
                          om.display_last_name
                      ) LIKE ?
                      OR LOWER(
                          om.display_first_name
                          || ' '
                          || om.display_last_name
                      ) LIKE ?
                      OR LOWER(
                          COALESCE(sm.title, '')
                      ) LIKE ?
                      OR LOWER(
                          COALESCE(
                              sm.specialization,
                              ''
                          )
                      ) LIKE ?
                  )

                ORDER BY
                    om.display_first_name,
                    om.display_last_name,
                    sm.staff_number
                """,
                (resultSet, rowNumber)
                -> mapStaff(resultSet),
                organizationId,
                includeArchived,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern,
                pattern
        );
    }

    @Transactional(readOnly = true)
    public StaffResponse findStaffMember(
            UUID organizationId,
            UUID staffId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    sm.id,
                    sm.membership_id,
                    om.user_id,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    sm.branch_id,
                    b.name AS branch_name,
                    sm.staff_number,
                    sm.title,
                    sm.specialization,
                    sm.employment_status,
                    sm.biography,
                    sm.hired_at,
                    sm.ended_at,
                    sm.created_at,
                    sm.updated_at

                FROM staff_members sm

                JOIN organization_memberships om
                    ON om.id = sm.membership_id
                   AND om.organization_id =
                       sm.organization_id

                JOIN users u
                    ON u.id = om.user_id

                LEFT JOIN branches b
                    ON b.id = sm.branch_id
                   AND b.organization_id =
                       sm.organization_id

                WHERE sm.id = ?
                  AND sm.organization_id = ?
                """,
                (resultSet, rowNumber)
                -> mapStaff(resultSet),
                staffId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Staff profile was not found."
                )
        );
    }

    @Transactional
    public StaffResponse createStaff(
            AuthenticatedUser actor,
            SaveStaffRequest request
    ) {
        validateRequest(request);

        validateMembershipForRole(
                actor.organizationId(),
                request.membershipId(),
                "INSTRUCTOR"
        );

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureStaffProfileDoesNotExist(
                actor.organizationId(),
                request.membershipId()
        );

        ensureStaffNumberIsUnique(
                actor.organizationId(),
                null,
                request.staffNumber()
        );

        UUID staffId = UUID.randomUUID();

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                INSERT INTO staff_members
                (
                    id,
                    organization_id,
                    membership_id,
                    branch_id,
                    staff_number,
                    title,
                    specialization,
                    employment_status,
                    biography,
                    hired_at,
                    ended_at,
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
                    'ACTIVE',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                staffId,
                actor.organizationId(),
                request.membershipId(),
                request.branchId(),
                normalizeStaffNumber(
                        request.staffNumber()
                ),
                normalizeNullable(request.title()),
                normalizeNullable(
                        request.specialization()
                ),
                normalizeNullable(request.biography()),
                request.hiredAt(),
                request.endedAt(),
                now,
                now
        );

        auditService.record(
                actor,
                "STAFF_PROFILE_CREATED",
                "STAFF_MEMBER",
                staffId,
                "Staff profile created with number "
                + normalizeStaffNumber(
                        request.staffNumber()
                )
        );

        return findStaffMember(
                actor.organizationId(),
                staffId
        );
    }

    @Transactional
    public StaffResponse updateStaff(
            AuthenticatedUser actor,
            UUID staffId,
            SaveStaffRequest request
    ) {
        StaffResponse existing = findStaffMember(
                actor.organizationId(),
                staffId
        );

        validateRequest(request);

        if (!existing.membershipId()
                .equals(request.membershipId())) {
            throw new BusinessRuleException(
                    "The account linked to a staff profile "
                    + "cannot be changed."
            );
        }

        validateMembershipForRole(
                actor.organizationId(),
                request.membershipId(),
                "INSTRUCTOR"
        );

        validateBranch(
                actor.organizationId(),
                request.branchId()
        );

        ensureStaffNumberIsUnique(
                actor.organizationId(),
                staffId,
                request.staffNumber()
        );

        int updatedRows = jdbcTemplate.update(
                """
                UPDATE staff_members
                SET
                    branch_id = ?,
                    staff_number = ?,
                    title = ?,
                    specialization = ?,
                    biography = ?,
                    hired_at = ?,
                    ended_at = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                request.branchId(),
                normalizeStaffNumber(
                        request.staffNumber()
                ),
                normalizeNullable(request.title()),
                normalizeNullable(
                        request.specialization()
                ),
                normalizeNullable(request.biography()),
                request.hiredAt(),
                request.endedAt(),
                OffsetDateTime.now(ZoneOffset.UTC),
                staffId,
                actor.organizationId()
        );

        if (updatedRows == 0) {
            throw new ResourceNotFoundException(
                    "Staff profile was not found."
            );
        }

        auditService.record(
                actor,
                "STAFF_PROFILE_UPDATED",
                "STAFF_MEMBER",
                staffId,
                "Staff profile updated."
        );

        return findStaffMember(
                actor.organizationId(),
                staffId
        );
    }

    @Transactional
    public void updateEmploymentStatus(
            AuthenticatedUser actor,
            UUID staffId,
            EmploymentStatus status
    ) {
        StaffResponse existing = findStaffMember(
                actor.organizationId(),
                staffId
        );

        jdbcTemplate.update(
                """
                UPDATE staff_members
                SET
                    employment_status = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                status.name(),
                OffsetDateTime.now(ZoneOffset.UTC),
                staffId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "STAFF_STATUS_UPDATED",
                "STAFF_MEMBER",
                staffId,
                "Staff status changed from "
                + existing.employmentStatus()
                + " to " + status
        );
    }

    private void validateRequest(
            SaveStaffRequest request
    ) {
        if (request.membershipId() == null) {
            throw new BusinessRuleException(
                    "An instructor account must be selected."
            );
        }

        LocalDate hiredAt = request.hiredAt();
        LocalDate endedAt = request.endedAt();

        if (hiredAt != null
                && endedAt != null
                && endedAt.isBefore(hiredAt)) {
            throw new BusinessRuleException(
                    "The employment end date cannot be "
                    + "before the hire date."
            );
        }
    }

    private void validateMembershipForRole(
            UUID organizationId,
            UUID membershipId,
            String roleName
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)

                FROM organization_memberships om

                JOIN membership_roles mr
                    ON mr.membership_id = om.id

                JOIN roles r
                    ON r.id = mr.role_id
                   AND r.organization_id =
                       om.organization_id

                WHERE om.id = ?
                  AND om.organization_id = ?
                  AND om.status IN ('ACTIVE', 'INVITED')
                  AND r.name = ?
                """,
                Integer.class,
                membershipId,
                organizationId,
                roleName
        );

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected account is not a valid "
                    + roleName.toLowerCase()
                    + " account for this organization."
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

        Integer count = jdbcTemplate.queryForObject(
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

        if (count == null || count == 0) {
            throw new BusinessRuleException(
                    "The selected branch is invalid or inactive."
            );
        }
    }

    private void ensureStaffProfileDoesNotExist(
            UUID organizationId,
            UUID membershipId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM staff_members
                WHERE organization_id = ?
                  AND membership_id = ?
                """,
                Integer.class,
                organizationId,
                membershipId
        );

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A staff profile already exists for "
                    + "the selected account."
            );
        }
    }

    private void ensureStaffNumberIsUnique(
            UUID organizationId,
            UUID excludedStaffId,
            String staffNumber
    ) {
        Integer count;

        if (excludedStaffId == null) {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM staff_members
                    WHERE organization_id = ?
                      AND LOWER(staff_number) =
                          LOWER(?)
                    """,
                    Integer.class,
                    organizationId,
                    normalizeStaffNumber(staffNumber)
            );
        } else {
            count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM staff_members
                    WHERE organization_id = ?
                      AND LOWER(staff_number) =
                          LOWER(?)
                      AND id <> ?
                    """,
                    Integer.class,
                    organizationId,
                    normalizeStaffNumber(staffNumber),
                    excludedStaffId
            );
        }

        if (count != null && count > 0) {
            throw new ConflictException(
                    "A staff profile with this staff number "
                    + "already exists."
            );
        }
    }

    private StaffResponse mapStaff(
            ResultSet resultSet
    ) throws SQLException {
        return new StaffResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject(
                        "membership_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "user_id",
                        UUID.class
                ),
                resultSet.getString("email"),
                resultSet.getString(
                        "display_first_name"
                ),
                resultSet.getString(
                        "display_last_name"
                ),
                resultSet.getObject(
                        "branch_id",
                        UUID.class
                ),
                resultSet.getString("branch_name"),
                resultSet.getString("staff_number"),
                resultSet.getString("title"),
                resultSet.getString("specialization"),
                EmploymentStatus.valueOf(
                        resultSet.getString(
                                "employment_status"
                        )
                ),
                resultSet.getString("biography"),
                resultSet.getObject(
                        "hired_at",
                        LocalDate.class
                ),
                resultSet.getObject(
                        "ended_at",
                        LocalDate.class
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

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return "%%";
        }

        return "%"
                + search.trim().toLowerCase()
                + "%";
    }

    private String normalizeStaffNumber(
            String staffNumber
    ) {
        return staffNumber
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
