package com.academy.platform.identity;

import java.sql.Array;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.academy.platform.common.PageResponse;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationUserQueryService {

    private final JdbcTemplate jdbcTemplate;

    public OrganizationUserQueryService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public PageResponse<OrganizationUserResponse> findUsers(
            UUID organizationId,
            String search,
            int page,
            int size
    ) {
        String normalizedSearch = search == null
                ? ""
                : search.trim().toLowerCase();

        String searchPattern =
                "%" + normalizedSearch + "%";

        long totalElements = countUsers(
                organizationId,
                searchPattern
        );

        int offset = page * size;

        List<OrganizationUserResponse> users =
                jdbcTemplate.query(
                        """
                        SELECT
                            u.id AS user_id,
                            om.id AS membership_id,
                            u.email,
                            u.first_name,
                            u.last_name,
                            om.status,
                            om.joined_at,
                            u.last_login_at,

                            COALESCE(
                                ARRAY_AGG(r.id ORDER BY r.name)
                                    FILTER (WHERE r.id IS NOT NULL),
                                ARRAY[]::UUID[]
                            ) AS role_ids,

                            COALESCE(
                                ARRAY_AGG(r.name ORDER BY r.name)
                                    FILTER (WHERE r.name IS NOT NULL),
                                ARRAY[]::VARCHAR[]
                            ) AS role_names

                        FROM organization_memberships om
                        JOIN users u
                            ON u.id = om.user_id

                        LEFT JOIN membership_roles mr
                            ON mr.membership_id = om.id

                        LEFT JOIN roles r
                            ON r.id = mr.role_id
                           AND r.organization_id =
                               om.organization_id

                        WHERE om.organization_id = ?
                          AND (
                              ? = '%%'
                              OR LOWER(u.email) LIKE ?
                              OR LOWER(u.first_name) LIKE ?
                              OR LOWER(u.last_name) LIKE ?
                              OR LOWER(
                                  u.first_name || ' ' || u.last_name
                              ) LIKE ?
                          )

                        GROUP BY
                            u.id,
                            om.id,
                            u.email,
                            u.first_name,
                            u.last_name,
                            om.status,
                            om.joined_at,
                            u.last_login_at

                        ORDER BY
                            u.first_name,
                            u.last_name,
                            u.email

                        LIMIT ?
                        OFFSET ?
                        """,
                        (resultSet, rowNumber) -> {
                            List<OrganizationUserResponse.RoleSummary>
                                    roles = mapRoles(
                                            resultSet.getArray(
                                                    "role_ids"
                                            ),
                                            resultSet.getArray(
                                                    "role_names"
                                            )
                                    );

                            return new OrganizationUserResponse(
                                    resultSet.getObject(
                                            "user_id",
                                            UUID.class
                                    ),
                                    resultSet.getObject(
                                            "membership_id",
                                            UUID.class
                                    ),
                                    resultSet.getString("email"),
                                    resultSet.getString(
                                            "first_name"
                                    ),
                                    resultSet.getString(
                                            "last_name"
                                    ),
                                    resultSet.getString("status"),
                                    roles,
                                    resultSet.getObject(
                                            "joined_at",
                                            OffsetDateTime.class
                                    ),
                                    resultSet.getObject(
                                            "last_login_at",
                                            OffsetDateTime.class
                                    )
                            );
                        },
                        organizationId,
                        searchPattern,
                        searchPattern,
                        searchPattern,
                        searchPattern,
                        searchPattern,
                        size,
                        offset
                );

        return PageResponse.of(
                users,
                page,
                size,
                totalElements
        );
    }

    private long countUsers(
            UUID organizationId,
            String searchPattern
    ) {
        Long result = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM organization_memberships om
                JOIN users u
                    ON u.id = om.user_id
                WHERE om.organization_id = ?
                  AND (
                      ? = '%%'
                      OR LOWER(u.email) LIKE ?
                      OR LOWER(u.first_name) LIKE ?
                      OR LOWER(u.last_name) LIKE ?
                      OR LOWER(
                          u.first_name || ' ' || u.last_name
                      ) LIKE ?
                  )
                """,
                Long.class,
                organizationId,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern,
                searchPattern
        );

        return result == null ? 0 : result;
    }

    private List<OrganizationUserResponse.RoleSummary> mapRoles(
            Array roleIdsArray,
            Array roleNamesArray
    ) throws SQLException {
        Object[] roleIds = (Object[]) roleIdsArray.getArray();
        Object[] roleNames = (Object[]) roleNamesArray.getArray();

        List<OrganizationUserResponse.RoleSummary> roles =
                new ArrayList<>();

        for (int index = 0; index < roleIds.length; index++) {
            UUID roleId = roleIds[index] instanceof UUID uuid
                    ? uuid
                    : UUID.fromString(
                            roleIds[index].toString()
                    );

            roles.add(
                    new OrganizationUserResponse.RoleSummary(
                            roleId,
                            roleNames[index].toString()
                    )
            );
        }

        return roles;
    }
}
