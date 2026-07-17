-- Invited users may not have a password until accepting
-- their invitation.
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;


-- Additional permissions required by future modules.

INSERT INTO permissions (id, code, description, created_at)
VALUES
    (
        '00000000-0000-0000-0001-000000000022',
        'curricula.read',
        'View curricula',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000023',
        'curricula.manage',
        'Create and update curricula',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000024',
        'guardian.portal.read',
        'Access the guardian portal',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000025',
        'guardian.linked-students.read',
        'View students linked to the guardian',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000026',
        'guardian.reports.read',
        'View reports for linked students',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE user_invitations
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    membership_id       UUID NOT NULL,
    token_hash          VARCHAR(64) NOT NULL,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at         TIMESTAMP WITH TIME ZONE,
    revoked_at          TIMESTAMP WITH TIME ZONE,
    created_by          UUID NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_user_invitations_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_user_invitations_membership
        FOREIGN KEY (membership_id)
        REFERENCES organization_memberships (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_invitations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT uk_user_invitations_token_hash
        UNIQUE (token_hash),

    CONSTRAINT ck_user_invitations_expiration
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_user_invitations_membership
    ON user_invitations (organization_id, membership_id);

CREATE INDEX idx_user_invitations_active
    ON user_invitations (token_hash, expires_at)
    WHERE accepted_at IS NULL
      AND revoked_at IS NULL;
