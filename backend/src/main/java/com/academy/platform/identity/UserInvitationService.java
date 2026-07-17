package com.academy.platform.identity;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.academy.platform.auditing.AuditService;
import com.academy.platform.authentication.AuthenticatedUser;
import com.academy.platform.common.BusinessRuleException;
import com.academy.platform.common.ConflictException;

@Service
public class UserInvitationService {

    private static final Set<String> INVITABLE_ROLES
            = Set.of("INSTRUCTOR", "GUARDIAN");

    private static final int INVITATION_VALID_DAYS = 7;

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final SecureTokenService secureTokenService;
    private final AuditService auditService;

    public UserInvitationService(
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder,
            SecureTokenService secureTokenService,
            AuditService auditService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.secureTokenService = secureTokenService;
        this.auditService = auditService;
    }

    @Transactional
    public UserInvitationResponse createInvitation(
            AuthenticatedUser actor,
            CreateUserInvitationRequest request
    ) {
        String normalizedEmail = request.email()
                .trim()
                .toLowerCase();

        validateRoles(
                actor.organizationId(),
                request.roleIds()
        );

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        UUID userId = findUserId(normalizedEmail);

        if (userId == null) {
            userId = UUID.randomUUID();

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
                        NULL,
                        ?,
                        ?,
                        'INVITED',
                        NULL,
                        ?,
                        ?,
                        0
                    )
                    """,
                    userId,
                    normalizedEmail,
                    request.firstName().trim(),
                    request.lastName().trim(),
                    now,
                    now
            );
        }

        UUID membershipId = findMembershipId(
                actor.organizationId(),
                userId
        );

        if (membershipId == null) {
            membershipId = UUID.randomUUID();

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
                        'INVITED',
                        ?,
                        ?,
                        0,
                        ?,
                        ?,
                        ?,
                        0
                    )
                    """,
                    membershipId,
                    actor.organizationId(),
                    userId,
                    request.firstName().trim(),
                    request.lastName().trim(),
                    now,
                    now,
                    now
            );
        } else {
            String membershipStatus
                    = findMembershipStatus(
                            actor.organizationId(),
                            membershipId
                    );

            if ("ACTIVE".equals(membershipStatus)) {
                throw new ConflictException(
                        "The user already belongs to this "
                        + "organization."
                );
            }

            if ("SUSPENDED".equals(membershipStatus)
                    || "ARCHIVED".equals(membershipStatus)) {
                throw new BusinessRuleException(
                        "A suspended or archived membership "
                        + "cannot be invited. Reactivate "
                        + "the membership instead."
                );
            }

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
        }

        replaceMembershipRoles(
                membershipId,
                request.roleIds()
        );

        jdbcTemplate.update(
                """
                UPDATE user_invitations
                SET revoked_at = ?
                WHERE organization_id = ?
                  AND membership_id = ?
                  AND accepted_at IS NULL
                  AND revoked_at IS NULL
                """,
                now,
                actor.organizationId(),
                membershipId
        );

        String rawToken = secureTokenService.generateToken();
        String tokenHash = secureTokenService.hash(rawToken);

        UUID invitationId = UUID.randomUUID();
        OffsetDateTime expiresAt
                = now.plusDays(INVITATION_VALID_DAYS);

        jdbcTemplate.update(
                """
                INSERT INTO user_invitations
                (
                    id,
                    organization_id,
                    membership_id,
                    token_hash,
                    expires_at,
                    accepted_at,
                    revoked_at,
                    created_by,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
                """,
                invitationId,
                actor.organizationId(),
                membershipId,
                tokenHash,
                expiresAt,
                actor.userId(),
                now
        );

        auditService.record(
                actor,
                "USER_INVITATION_CREATED",
                "ORGANIZATION_MEMBERSHIP",
                membershipId,
                "Invitation created for " + normalizedEmail
        );

        return new UserInvitationResponse(
                invitationId,
                membershipId,
                rawToken,
                expiresAt
        );
    }

    @Transactional
    public AcceptUserInvitationResponse acceptInvitation(
            AcceptUserInvitationRequest request
    ) {
        String tokenHash
                = secureTokenService.hash(request.token());

        InvitationRecord invitation = jdbcTemplate.query(
                """
                SELECT
                    ui.id AS invitation_id,
                    ui.organization_id,
                    ui.membership_id,
                    ui.expires_at,
                    om.user_id,
                    u.email,
                    u.password_hash,
                    o.slug AS organization_slug

                FROM user_invitations ui

                JOIN organization_memberships om
                    ON om.id = ui.membership_id
                   AND om.organization_id =
                       ui.organization_id

                JOIN users u
                    ON u.id = om.user_id

                JOIN organizations o
                    ON o.id = ui.organization_id

                WHERE ui.token_hash = ?
                  AND ui.accepted_at IS NULL
                  AND ui.revoked_at IS NULL
                """,
                (resultSet, rowNumber)
                -> new InvitationRecord(
                        resultSet.getObject(
                                "invitation_id",
                                UUID.class
                        ),
                        resultSet.getObject(
                                "organization_id",
                                UUID.class
                        ),
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
                                "password_hash"
                        ),
                        resultSet.getString(
                                "organization_slug"
                        ),
                        resultSet.getObject(
                                "expires_at",
                                OffsetDateTime.class
                        )
                ),
                tokenHash
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "The invitation is invalid or has already "
                        + "been used."
                )
        );

        OffsetDateTime now
                = OffsetDateTime.now(ZoneOffset.UTC);

        if (!invitation.expiresAt().isAfter(now)) {
            throw new BusinessRuleException(
                    "The invitation has expired."
            );
        }

        if (invitation.passwordHash() == null) {
            if (request.password() == null
                    || request.password().length() < 12) {
                throw new BusinessRuleException(
                        "A password containing at least 12 "
                        + "characters is required."
                );
            }

            jdbcTemplate.update(
                    """
                    UPDATE users
                    SET
                        password_hash = ?,
                        status = 'ACTIVE',
                        email_verified_at = ?,
                        updated_at = ?,
                        version = version + 1
                    WHERE id = ?
                    """,
                    passwordEncoder.encode(
                            request.password()
                    ),
                    now,
                    now,
                    invitation.userId()
            );
        }

        jdbcTemplate.update(
                """
                UPDATE organization_memberships
                SET
                    status = 'ACTIVE',
                    joined_at = ?,
                    updated_at = ?,
                    security_version =
                        security_version + 1,
                    version = version + 1
                WHERE id = ?
                  AND organization_id = ?
                """,
                now,
                now,
                invitation.membershipId(),
                invitation.organizationId()
        );

        jdbcTemplate.update(
                """
                UPDATE user_invitations
                SET accepted_at = ?
                WHERE id = ?
                  AND accepted_at IS NULL
                  AND revoked_at IS NULL
                """,
                now,
                invitation.invitationId()
        );

        auditService.recordSystemAction(
                invitation.organizationId(),
                "USER_INVITATION_ACCEPTED",
                "ORGANIZATION_MEMBERSHIP",
                invitation.membershipId(),
                "Invitation accepted by "
                + invitation.email()
        );

        return new AcceptUserInvitationResponse(
                invitation.organizationSlug(),
                invitation.email(),
                true
        );
    }

    private void validateRoles(
            UUID organizationId,
            Set<UUID> roleIds
    ) {
        if (roleIds.isEmpty()) {
            throw new BusinessRuleException(
                    "At least one role must be selected."
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
                    (resultSet, rowNumber)
                    -> resultSet.getString("name"),
                    roleId,
                    organizationId
            ).stream().findFirst().orElseThrow(
                    () -> new BusinessRuleException(
                            "One or more selected roles are invalid."
                    )
            );

            if (!INVITABLE_ROLES.contains(roleName)) {
                throw new BusinessRuleException(
                        "This role cannot be assigned through an "
                        + "invitation: " + roleName
                );
            }
        }
    }

    private UUID findUserId(String email) {
        return jdbcTemplate.query(
                """
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER(?)
                """,
                (resultSet, rowNumber)
                -> resultSet.getObject("id", UUID.class),
                email
        ).stream().findFirst().orElse(null);
    }

    private UUID findMembershipId(
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
                (resultSet, rowNumber)
                -> resultSet.getObject("id", UUID.class),
                organizationId,
                userId
        ).stream().findFirst().orElse(null);
    }

    private String findMembershipStatus(
            UUID organizationId,
            UUID membershipId
    ) {
        return jdbcTemplate.query(
                """
                SELECT status
                FROM organization_memberships
                WHERE organization_id = ?
                  AND id = ?
                """,
                (resultSet, rowNumber)
                -> resultSet.getString("status"),
                organizationId,
                membershipId
        ).stream().findFirst().orElseThrow(
                () -> new BusinessRuleException(
                        "Membership could not be found."
                )
        );
    }

    private void replaceMembershipRoles(
            UUID membershipId,
            Set<UUID> roleIds
    ) {
        jdbcTemplate.update(
                """
                DELETE FROM membership_roles
                WHERE membership_id = ?
                """,
                membershipId
        );

        for (UUID roleId : roleIds) {
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
    }

    private record InvitationRecord(
            UUID invitationId,
            UUID organizationId,
            UUID membershipId,
            UUID userId,
            String email,
            String passwordHash,
            String organizationSlug,
            OffsetDateTime expiresAt
            ) {

    }
}
