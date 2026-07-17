ALTER TABLE organization_memberships
    ADD COLUMN display_first_name VARCHAR(100),
    ADD COLUMN display_last_name VARCHAR(100),
    ADD COLUMN security_version BIGINT NOT NULL DEFAULT 0;

UPDATE organization_memberships om
SET
    display_first_name = u.first_name,
    display_last_name = u.last_name
FROM users u
WHERE u.id = om.user_id;

ALTER TABLE organization_memberships
    ALTER COLUMN display_first_name SET NOT NULL,
    ALTER COLUMN display_last_name SET NOT NULL;


CREATE TABLE audit_logs
(
    id                   UUID PRIMARY KEY,
    organization_id      UUID NOT NULL,
    actor_user_id        UUID,
    actor_membership_id  UUID,
    action               VARCHAR(100) NOT NULL,
    entity_type          VARCHAR(100) NOT NULL,
    entity_id            UUID,
    details              TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_audit_logs_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_audit_logs_actor_user
        FOREIGN KEY (actor_user_id)
        REFERENCES users (id),

    CONSTRAINT fk_audit_logs_actor_membership
        FOREIGN KEY (actor_membership_id)
        REFERENCES organization_memberships (id)
);

CREATE INDEX idx_audit_logs_organization_created
    ON audit_logs (organization_id, created_at DESC);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs (organization_id, entity_type, entity_id);

CREATE INDEX idx_audit_logs_actor
    ON audit_logs (organization_id, actor_user_id);
