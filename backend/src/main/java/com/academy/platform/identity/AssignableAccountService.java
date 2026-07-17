package com.academy.platform.identity;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.academy.platform.common.BusinessRuleException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignableAccountService {

    private static final Set<String> SUPPORTED_ROLES =
            Set.of("INSTRUCTOR", "GUARDIAN");

    private final JdbcTemplate jdbcTemplate;

    public AssignableAccountService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<AssignableAccountResponse> findAccounts(
            UUID organizationId,
            String roleName
    ) {
        String normalizedRole = roleName
                .trim()
                .toUpperCase();

        if (!SUPPORTED_ROLES.contains(normalizedRole)) {
            throw new BusinessRuleException(
                    "Unsupported account role."
            );
        }

        String profileTable = normalizedRole.equals(
                "INSTRUCTOR"
        )
                ? "staff_members"
                : "guardians";

        String sql = """
                SELECT
                    om.id AS membership_id,
                    om.user_id,
                    u.email,
                    om.display_first_name,
                    om.display_last_name,
                    om.status

                FROM organization_memberships om

                JOIN users u
                    ON u.id = om.user_id

                JOIN membership_roles mr
                    ON mr.membership_id = om.id

                JOIN roles r
                    ON r.id = mr.role_id
                   AND r.organization_id =
                       om.organization_id

                WHERE om.organization_id = ?
                  AND om.status IN ('ACTIVE', 'INVITED')
                  AND r.name = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM %s profile
                      WHERE profile.organization_id =
                                om.organization_id
                        AND profile.membership_id = om.id
                  )

                ORDER BY
                    om.display_first_name,
                    om.display_last_name,
                    u.email
                """.formatted(profileTable);

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNumber) ->
                        new AssignableAccountResponse(
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
                                resultSet.getString("status")
                        ),
                organizationId,
                normalizedRole
        );
    }
}
