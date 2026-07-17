package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ResourceNotFoundException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationMembershipAdministrationService {

    private static final Set<String> EDITABLE_ROLES =
            Set.of(
                    "ORGANIZATION_ADMIN",
                    "INSTRUCTOR",
                    "GUARDIAN"
            );

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public OrganizationMembershipAdministrationService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    public void updateMembership(
            AuthenticatedUser actor,
            UUID membershipId,
            UpdateOrganizationUserRequest request
    ) {
        MembershipRecord membership =
                findMembership(
                        actor.organizationId(),
                        membershipId
                );

        Set<UUID> newRoleIds =
                Set.copyOf(request.roleIds());

        Set<UUID> currentRoleIds =
                findRoleIds(membershipId);

        validateRoles(
                actor.organizationId(),
                newRoleIds
        );

        boolean rolesChanged =
                !currentRoleIds.equals(newRoleIds);

        if (actor.membershipId().equals(membershipId)
                && rolesChanged) {
            throw new BusinessRuleException(
                    "You cannot change your own roles."
            );
        }

        boolean currentlyAdministrator =
                hasRole(
                        membershipId,
                        "ORGANIZATION_ADMIN"
                );

        boolean willRemainAdministrator =
                roleSetContains(
                        actor.organizationId(),
                        newRoleIds,
                        "ORGANIZATION_ADMIN"
                );

        if (currentlyAdministrator
                && !willRemainAdministrator) {
            ensureAnotherActiveAdministratorExists(
                    actor.organizationId(),
                    membershipId
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE organization_memberships
                SET
                    display_first_name = ?,
                    display_last_name = ?,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                request.firstName().trim(),
                request.lastName().trim(),
                now,
                membershipId,
                actor.organizationId()
        );

        if (rolesChanged) {
            jdbcTemplate.update(
                    """
                    DELETE FROM membership_roles
                    WHERE membership_id = ?
                    """,
                    membershipId
            );

            for (UUID roleId : newRoleIds) {
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

            incrementSecurityVersion(
                    actor.organizationId(),
                    membershipId
            );
        }

        auditService.record(
                actor,
                "ORGANIZATION_USER_UPDATED",
                "ORGANIZATION_MEMBERSHIP",
                membershipId,
                "Updated membership for "
                        + membership.email()
        );
    }

    @Transactional
    public void suspendMembership(
            AuthenticatedUser actor,
            UUID membershipId
    ) {
        if (actor.membershipId().equals(membershipId)) {
            throw new BusinessRuleException(
                    "You cannot suspend your own membership."
            );
        }

        MembershipRecord membership =
                findMembership(
                        actor.organizationId(),
                        membershipId
                );

        if ("SUSPENDED".equals(membership.status())) {
            return;
        }

        if ("ARCHIVED".equals(membership.status())) {
            throw new BusinessRuleException(
                    "An archived membership cannot be suspended."
            );
        }

        if (hasRole(
                membershipId,
                "ORGANIZATION_ADMIN"
        )) {
            ensureAnotherActiveAdministratorExists(
                    actor.organizationId(),
                    membershipId
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE organization_memberships
                SET
                    status = 'SUSPENDED',
                    security_version =
                        security_version + 1,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                now,
                membershipId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "ORGANIZATION_USER_SUSPENDED",
                "ORGANIZATION_MEMBERSHIP",
                membershipId,
                "Suspended membership for "
                        + membership.email()
        );
    }

    @Transactional
    public void reactivateMembership(
            AuthenticatedUser actor,
            UUID membershipId
    ) {
        MembershipRecord membership =
                findMembership(
                        actor.organizationId(),
                        membershipId
                );

        if ("ACTIVE".equals(membership.status())) {
            return;
        }

        if (!"SUSPENDED".equals(membership.status())) {
            throw new BusinessRuleException(
                    "Only a suspended membership can be "
                            + "reactivated."
            );
        }

        OffsetDateTime now =
                OffsetDateTime.now(ZoneOffset.UTC);

        jdbcTemplate.update(
                """
                UPDATE organization_memberships
                SET
                    status = 'ACTIVE',
                    security_version =
                        security_version + 1,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                now,
                membershipId,
                actor.organizationId()
        );

        auditService.record(
                actor,
                "ORGANIZATION_USER_REACTIVATED",
                "ORGANIZATION_MEMBERSHIP",
                membershipId,
                "Reactivated membership for "
                        + membership.email()
        );
    }

    private MembershipRecord findMembership(
            UUID organizationId,
            UUID membershipId
    ) {
        return jdbcTemplate.query(
                """
                SELECT
                    om.id,
                    om.user_id,
                    om.status,
                    u.email
                FROM organization_memberships om
                JOIN users u
                    ON u.id = om.user_id
                WHERE om.id = ?
                  AND om.organization_id = ?
                """,
                (resultSet, rowNumber) ->
                        new MembershipRecord(
                                resultSet.getObject(
                                        "id",
                                        UUID.class
                                ),
                                resultSet.getObject(
                                        "user_id",
                                        UUID.class
                                ),
                                resultSet.getString("status"),
                                resultSet.getString("email")
                        ),
                membershipId,
                organizationId
        ).stream().findFirst().orElseThrow(
                () -> new ResourceNotFoundException(
                        "Organization membership was not found."
                )
        );
    }

    private Set<UUID> findRoleIds(UUID membershipId) {
        return new HashSet<>(
                jdbcTemplate.queryForList(
                        """
                        SELECT role_id
                        FROM membership_roles
                        WHERE membership_id = ?
                        """,
                        UUID.class,
                        membershipId
                )
        );
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
            String roleName = jdbcTemplate.query(
                    """
                    SELECT name
                    FROM roles
                    WHERE id = ?
                      AND organization_id = ?
                    """,
                    (resultSet, rowNumber) ->
                            resultSet.getString("name"),
                    roleId,
                    organizationId
            ).stream().findFirst().orElseThrow(
                    () -> new BusinessRuleException(
                            "One or more selected roles are invalid."
                    )
            );

            if (!EDITABLE_ROLES.contains(roleName)) {
                throw new BusinessRuleException(
                        "This role cannot be assigned: "
                                + roleName
                );
            }
        }
    }

    private boolean hasRole(
            UUID membershipId,
            String roleName
    ) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM membership_roles mr
                JOIN roles r
                    ON r.id = mr.role_id
                WHERE mr.membership_id = ?
                  AND r.name = ?
                """,
                Integer.class,
                membershipId,
                roleName
        );

        return count != null && count > 0;
    }

    private boolean roleSetContains(
            UUID organizationId,
            Set<UUID> roleIds,
            String roleName
    ) {
        if (roleIds.isEmpty()) {
            return false;
        }

        for (UUID roleId : roleIds) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM roles
                    WHERE id = ?
                      AND organization_id = ?
                      AND name = ?
                    """,
                    Integer.class,
                    roleId,
                    organizationId,
                    roleName
            );

            if (count != null && count > 0) {
                return true;
            }
        }

        return false;
    }

    private void ensureAnotherActiveAdministratorExists(
            UUID organizationId,
            UUID excludedMembershipId
    ) {
        Integer administratorCount =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(DISTINCT om.id)

                        FROM organization_memberships om

                        JOIN membership_roles mr
                            ON mr.membership_id = om.id

                        JOIN roles r
                            ON r.id = mr.role_id
                           AND r.organization_id =
                               om.organization_id

                        WHERE om.organization_id = ?
                          AND om.id <> ?
                          AND om.status = 'ACTIVE'
                          AND r.name =
                              'ORGANIZATION_ADMIN'
                        """,
                        Integer.class,
                        organizationId,
                        excludedMembershipId
                );

        if (administratorCount == null
                || administratorCount == 0) {
            throw new BusinessRuleException(
                    "The last active organization administrator "
                            + "cannot be removed or suspended."
            );
        }
    }

    private void incrementSecurityVersion(
            UUID organizationId,
            UUID membershipId
    ) {
        jdbcTemplate.update(
                """
                UPDATE organization_memberships
                SET
                    security_version =
                        security_version + 1,
                    updated_at = ?,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                OffsetDateTime.now(ZoneOffset.UTC),
                membershipId,
                organizationId
        );
    }

    private record MembershipRecord(
            UUID id,
            UUID userId,
            String status,
            String email
    ) {
    }
}
