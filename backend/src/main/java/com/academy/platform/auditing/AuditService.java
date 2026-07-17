package com.academy.platform.auditing;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import com.academy.platform.authentication.AuthenticatedUser;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final JdbcTemplate jdbcTemplate;

    public AuditService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(
            AuthenticatedUser actor,
            String action,
            String entityType,
            UUID entityId,
            String details
    ) {
        record(
                actor.organizationId(),
                actor.userId(),
                actor.membershipId(),
                action,
                entityType,
                entityId,
                details
        );
    }

    public void recordSystemAction(
            UUID organizationId,
            String action,
            String entityType,
            UUID entityId,
            String details
    ) {
        record(
                organizationId,
                null,
                null,
                action,
                entityType,
                entityId,
                details
        );
    }

    private void record(
            UUID organizationId,
            UUID actorUserId,
            UUID actorMembershipId,
            String action,
            String entityType,
            UUID entityId,
            String details
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO audit_logs
                (
                    id,
                    organization_id,
                    actor_user_id,
                    actor_membership_id,
                    action,
                    entity_type,
                    entity_id,
                    details,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                organizationId,
                actorUserId,
                actorMembershipId,
                action,
                entityType,
                entityId,
                details,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
    }
}
