package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;

import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationUserCommandService {

    private static final Set<String> ASSIGNABLE_SYSTEM_ROLES =
            Set.of(
                    "INSTRUCTOR",
                    "GUARDIAN"
            );

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public OrganizationUserCommandService(
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UUID createActiveUser(
            UUID organizationId,
            CreateOrganizationUserRequest request
    ) {
        String normalizedEmail = request.email()
                .trim()
                .toLowerCase();

        validateRoles(
                organizationId,
                request.roleIds()
        );

        UUID existingUserId = findUserId(normalizedEmail);

        if (existingUserId != null) {
            boolean membershipExists =
                    membershipExists(
                            organizationId,
                            existingUserId
                    );

            if (membershipExists) {
                throw new ConflictException(
                        "A user with this email already belongs "
                                + "to the organization."
                );
            }

            throw new BusinessRuleException(
                    "This email already belongs to an existing "
                            + "platform user. Use the invitation "
                            + "workflow to add the user to another "
                            + "organization."
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        UUID userId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();

        jdbcTemplate.update(
                """
                INSERT INTO users
                (
                    id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    status,
                    email_verified_at,
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
                    NULL,
                    ?,
                    ?,
                    0
                )
                """,
                userId,
                normalizedEmail,
                passwordEncoder.encode(
                        request.temporaryPassword()
                ),
                request.firstName().trim(),
                request.lastName().trim(),
                now,
                now
        );

        jdbcTemplate.update(
                """
                INSERT INTO organization_memberships
                (
                    id,
                    organization_id,
                    user_id,
                    status,
                    joined_at,
                    created_at,
                    updated_at,
                    version
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    'ACTIVE',
                    ?,
                    ?,
                    ?,
                    0
                )
                """,
                membershipId,
                organizationId,
                userId,
                now,
                now,
                now
        );

        for (UUID roleId : request.roleIds()) {
            jdbcTemplate.update(
                    """
                    INSERT INTO membership_roles
                        (membership_id, role_id)
                    VALUES (?, ?)
                    """,
                    membershipId,
                    roleId
            );
        }

        return membershipId;
    }

    private void validateRoles(
            UUID organizationId,
            Set<UUID> roleIds
    ) {
        if (roleIds.isEmpty()) {
            throw new BusinessRuleException(
                    "At least one role must be assigned."
            );
        }

        for (UUID roleId : roleIds) {
            RoleRecord role = jdbcTemplate.query(
                    """
                    SELECT
                        id,
                        name
                    FROM roles
                    WHERE id = ?
                      AND organization_id = ?
                    """,
                    (resultSet, rowNumber) ->
                            new RoleRecord(
                                    resultSet.getObject(
                                            "id",
                                            UUID.class
                                    ),
                                    resultSet.getString("name")
                            ),
                    roleId,
                    organizationId
            ).stream().findFirst().orElseThrow(
                    () -> new BusinessRuleException(
                            "One or more selected roles are invalid."
                    )
            );

            if (!ASSIGNABLE_SYSTEM_ROLES.contains(role.name())) {
                throw new BusinessRuleException(
                        "The role cannot be assigned through "
                                + "this operation: " + role.name()
                );
            }
        }
    }

    private UUID findUserId(String normalizedEmail) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER(?)
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class),
                normalizedEmail
        ).stream().findFirst().orElse(null);
    }

    private boolean membershipExists(
            UUID organizationId,
            UUID userId
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM organization_memberships
                WHERE organization_id = ?
                  AND user_id = ?
                """,
                Integer.class,
                organizationId,
                userId
        );

        return count != null && count > 0;
    }

    private record RoleRecord(
            UUID id,
            String name
    ) {
    }
}
