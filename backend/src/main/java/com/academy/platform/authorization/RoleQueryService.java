package com.academy.platform.authorization;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleQueryService {

    private final JdbcTemplate jdbcTemplate;

    public RoleQueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> findOrganizationRoles(
            UUID organizationId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    name,
                    description,
                    system_role
                FROM roles
                WHERE organization_id = ?
                ORDER BY name
                """,
                (resultSet, rowNumber) ->
                        new RoleResponse(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getString("name"),
                                resultSet.getString(
                                        "description"
                                ),
                                resultSet.getBoolean(
                                        "system_role"
                                )
                        ),
                organizationId
        );
    }
}
