package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import com.academy.platform.authorization.StandardRoleProvisioningService;

@Service
public class BootstrapService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final StandardRoleProvisioningService standardRoleProvisioningService;

    @Value("${app.bootstrap.enabled:false}")
    private boolean enabled;

    @Value("${app.bootstrap.organization-name}")
    private String organizationName;

    @Value("${app.bootstrap.organization-slug}")
    private String organizationSlug;

    @Value("${app.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${app.bootstrap.admin-first-name}")
    private String adminFirstName;

    @Value("${app.bootstrap.admin-last-name}")
    private String adminLastName;

    public BootstrapService(
        JdbcTemplate jdbcTemplate,
        PasswordEncoder passwordEncoder,
        StandardRoleProvisioningService
                standardRoleProvisioningService
        ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.standardRoleProvisioningService =
                standardRoleProvisioningService;
        }

    @Transactional
    public void initialize() {
        if (!enabled) {
            return;
        }

        validateConfiguration();

        String normalizedSlug = organizationSlug
                .trim()
                .toLowerCase();

        String normalizedEmail = adminEmail
                .trim()
                .toLowerCase();

        UUID organizationId = findOrCreateOrganization(normalizedSlug);
        standardRoleProvisioningService.provision(organizationId);
        UUID userId = findOrCreateUser(normalizedEmail);
        UUID membershipId = findOrCreateMembership(
                organizationId,
                userId
        );

        UUID roleId = findOrCreateAdministratorRole(organizationId);

        assignAllPermissions(roleId);
        assignRole(membershipId, roleId);
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(adminEmail)) {
            throw new IllegalStateException(
                    "BOOTSTRAP_ADMIN_EMAIL is required."
            );
        }

        if (!StringUtils.hasText(adminPassword)
                || adminPassword.length() < 12) {
            throw new IllegalStateException(
                    "BOOTSTRAP_ADMIN_PASSWORD must contain at least "
                            + "12 characters."
            );
        }
    }

    private UUID findOrCreateOrganization(String slug) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM organizations
                WHERE LOWER(slug) = LOWER(?)
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class),
                slug
        ).stream().findFirst().orElseGet(() -> {
            UUID id = UUID.randomUUID();
            OffsetDateTime now = now();

            jdbcTemplate.update(
                    """
                    INSERT INTO organizations
                    (
                        id,
                        name,
                        slug,
                        status,
                        default_locale,
                        timezone,
                        settings,
                        created_at,
                        updated_at,
                        version
                    )
                    VALUES (?, ?, ?, 'ACTIVE', 'en-US', 'UTC',
                            '{}'::jsonb, ?, ?, 0)
                    """,
                    id,
                    organizationName.trim(),
                    slug,
                    now,
                    now
            );

            return id;
        });
    }

    private UUID findOrCreateUser(String email) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER(?)
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class),
                email
        ).stream().findFirst().orElseGet(() -> {
            UUID id = UUID.randomUUID();
            OffsetDateTime now = now();

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
                    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 0)
                    """,
                    id,
                    email,
                    passwordEncoder.encode(adminPassword),
                    adminFirstName.trim(),
                    adminLastName.trim(),
                    now,
                    now,
                    now
            );

            return id;
        });
    }

    private UUID findOrCreateMembership(
            UUID organizationId,
            UUID userId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM organization_memberships
                WHERE organization_id = ?
                  AND user_id = ?
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class),
                organizationId,
                userId
        ).stream().findFirst().orElseGet(() -> {
            UUID id = UUID.randomUUID();
            OffsetDateTime now = now();

            jdbcTemplate.update(
                        """
                        INSERT INTO organization_memberships
                        (
                        id,
                        organization_id,
                        user_id,
                        status,
                        display_first_name,
                        display_last_name,
                        security_version,
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
                        0,
                        ?,
                        ?,
                        ?,
                        0
                        )
                        """,
                        id,
                        organizationId,
                        userId,
                        adminFirstName.trim(),
                        adminLastName.trim(),
                        now,
                        now,
                        now
            );

            return id;
        });
    }

    private UUID findOrCreateAdministratorRole(
            UUID organizationId
    ) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM roles
                WHERE organization_id = ?
                  AND name = 'ORGANIZATION_ADMIN'
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class),
                organizationId
        ).stream().findFirst().orElseGet(() -> {
            UUID id = UUID.randomUUID();
            OffsetDateTime now = now();

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
                    VALUES (
                        ?,
                        ?,
                        'ORGANIZATION_ADMIN',
                        'Organization administrator',
                        TRUE,
                        ?,
                        ?,
                        0
                    )
                    """,
                    id,
                    organizationId,
                    now,
                    now
            );

            return id;
        });
    }

    private void assignAllPermissions(UUID roleId) {
        jdbcTemplate.update(
                """
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT ?, p.id
                FROM permissions p
                ON CONFLICT DO NOTHING
                """,
                roleId
        );
    }

    private void assignRole(
            UUID membershipId,
            UUID roleId
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO membership_roles
                    (membership_id, role_id)
                VALUES (?, ?)
                ON CONFLICT DO NOTHING
                """,
                membershipId,
                roleId
        );
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
