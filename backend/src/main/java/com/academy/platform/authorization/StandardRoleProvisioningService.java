package com.academy.platform.authorization;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StandardRoleProvisioningService {

    private static final String ORGANIZATION_ADMIN
            = "ORGANIZATION_ADMIN";

    private static final String INSTRUCTOR
            = "INSTRUCTOR";

    private static final String GUARDIAN
            = "GUARDIAN";

    private final JdbcTemplate jdbcTemplate;

    public StandardRoleProvisioningService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void provision(UUID organizationId) {
        UUID administratorRoleId = findOrCreateRole(
                organizationId,
                ORGANIZATION_ADMIN,
                "Organization administrator"
        );

        UUID instructorRoleId = findOrCreateRole(
                organizationId,
                INSTRUCTOR,
                "Instructor, coach, or teacher"
        );

        UUID guardianRoleId = findOrCreateRole(
                organizationId,
                GUARDIAN,
                "Parent or legal guardian"
        );

        assignAllPermissions(administratorRoleId);

        assignPermissions(
                instructorRoleId,
                List.of(
                        "students.read",
                        "staff.read",
                        "groups.read",
                        "curricula.read",
                        "sessions.read",
                        "sessions.manage",
                        "attendance.read",
                        "attendance.record",
                        "evaluations.read",
                        "evaluations.manage",
                        "reports.read",
                        "branches.read",
                        "programs.read",
                        "terms.read",
                        "enrollments.read",
                        "group_staff.read",
                        "group_curricula.read",
                        "attendance.finalize",
                        "attendance.correct",
                        "media.read",
                        "media.upload"
                )
        );

        assignPermissions(
                guardianRoleId,
                List.of(
                        "guardian.portal.read",
                        "guardian.linked-students.read",
                        "guardian.reports.read"
                )
        );
    }

    private UUID findOrCreateRole(
            UUID organizationId,
            String name,
            String description
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM roles
                WHERE organization_id = ?
                  AND name = ?
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject("id", UUID.class),
                organizationId,
                name
        ).stream().findFirst().orElseGet(() -> {
            UUID roleId = UUID.randomUUID();
            OffsetDateTime now
                    = OffsetDateTime.now(ZoneOffset.UTC);

            jdbcTemplate.update(
                    """
                    INSERT INTO roles
                    (
                        id,
                        organization_id,
                        name,
                        description,
                        system_role,
                        created_at,
                        updated_at,
                        version
                    )
                    VALUES (?, ?, ?, ?, TRUE, ?, ?, 0)
                    """,
                    roleId,
                    organizationId,
                    name,
                    description,
                    now,
                    now
            );

            return roleId;
        });
    }

    private void assignAllPermissions(UUID roleId) {
        jdbcTemplate.update(
                """
                INSERT INTO role_permissions
                    (role_id, permission_id)
                SELECT ?, p.id
                FROM permissions p
                ON CONFLICT DO NOTHING
                """,
                roleId
        );
    }

    private void assignPermissions(
            UUID roleId,
            List<String> permissionCodes
    ) {
        jdbcTemplate.update(
                """
                DELETE FROM role_permissions
                WHERE role_id = ?
                """,
                roleId
        );

        for (String permissionCode : permissionCodes) {
            int insertedRows = jdbcTemplate.update(
                    """
                    INSERT INTO role_permissions
                        (role_id, permission_id)
                    SELECT ?, p.id
                    FROM permissions p
                    WHERE p.code = ?
                    ON CONFLICT DO NOTHING
                    """,
                    roleId,
                    permissionCode
            );

            if (insertedRows == 0) {
                throw new IllegalStateException(
                        "Permission does not exist: "
                        + permissionCode
                );
            }
        }
    }
}
