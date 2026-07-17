package com.academy.platform.authentication;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public AuthenticationService(
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthenticatedUser authenticate(LoginRequest request) {
        String normalizedEmail = request.email()
                .trim()
                .toLowerCase();

        String normalizedSlug = request.organizationSlug()
                .trim()
                .toLowerCase();

        Optional<LoginAccount> account = findAccount(
                normalizedEmail,
                normalizedSlug
        );

        if (account.isEmpty()) {
            throw new InvalidCredentialsException();
        }

        LoginAccount loginAccount = account.get();

        if (loginAccount.passwordHash() == null
        || !passwordEncoder.matches(
                request.password(),
                loginAccount.passwordHash()
        )) {
            throw new InvalidCredentialsException();
        }

        Set<String> roles = findRoles(loginAccount.membershipId());
        Set<String> permissions =
                findPermissions(loginAccount.membershipId());

        jdbcTemplate.update(
                """
                UPDATE users
                SET last_login_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                OffsetDateTime.now(ZoneOffset.UTC),
                loginAccount.userId()
        );

        return new AuthenticatedUser(
                loginAccount.userId(),
                loginAccount.organizationId(),
                loginAccount.membershipId(),
                loginAccount.securityVersion(),
                loginAccount.organizationName(),
                loginAccount.organizationSlug(),
                loginAccount.email(),
                loginAccount.firstName(),
                loginAccount.lastName(),
                roles,
                permissions
        );
    }

    private Optional<LoginAccount> findAccount(
        String email,
        String organizationSlug
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    u.id AS user_id,
                    u.email,
                    u.password_hash,

                    COALESCE(
                        om.display_first_name,
                        u.first_name
                    ) AS first_name,

                    COALESCE(
                        om.display_last_name,
                        u.last_name
                    ) AS last_name,

                    o.id AS organization_id,
                    o.name AS organization_name,
                    o.slug AS organization_slug,

                    om.id AS membership_id,
                    om.security_version

                FROM users u

                JOIN organization_memberships om
                    ON om.user_id = u.id

                JOIN organizations o
                    ON o.id = om.organization_id

                WHERE LOWER(u.email) = LOWER(?)
                AND LOWER(o.slug) = LOWER(?)
                AND u.status = 'ACTIVE'
                AND om.status = 'ACTIVE'
                AND o.status = 'ACTIVE'
                """,
                (resultSet, rowNumber) -> mapAccount(resultSet),
                email,
                organizationSlug
        ).stream().findFirst();
    }

    private LoginAccount mapAccount(ResultSet resultSet)
            throws SQLException {

        return new LoginAccount(
                resultSet.getObject("user_id", UUID.class),
                resultSet.getObject(
                        "organization_id",
                        UUID.class
                ),
                resultSet.getObject(
                        "membership_id",
                        UUID.class
                ),
                resultSet.getLong("security_version"),
                resultSet.getString("organization_name"),
                resultSet.getString("organization_slug"),
                resultSet.getString("email"),
                resultSet.getString("password_hash"),
                resultSet.getString("first_name"),
                resultSet.getString("last_name")
        );
    }

    private Set<String> findRoles(UUID membershipId) {
        return new HashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT r.name
                        FROM roles r
                        JOIN membership_roles mr
                            ON mr.role_id = r.id
                        WHERE mr.membership_id = ?
                        ORDER BY r.name
                        """,
                        String.class,
                        membershipId
                )
        );
    }

    private Set<String> findPermissions(UUID membershipId) {
        return new HashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT DISTINCT p.code
                        FROM permissions p
                        JOIN role_permissions rp
                            ON rp.permission_id = p.id
                        JOIN roles r
                            ON r.id = rp.role_id
                        JOIN membership_roles mr
                            ON mr.role_id = r.id
                        WHERE mr.membership_id = ?
                        ORDER BY p.code
                        """,
                        String.class,
                        membershipId
                )
        );
    }

    private record LoginAccount(
        UUID userId,
        UUID organizationId,
        UUID membershipId,
        long securityVersion,
        String organizationName,
        String organizationSlug,
        String email,
        String passwordHash,
        String firstName,
        String lastName
    ) {
    }
}
