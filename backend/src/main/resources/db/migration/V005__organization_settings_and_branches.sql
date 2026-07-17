INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000027',
        'organization.settings.read',
        'View organization settings',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000028',
        'organization.settings.update',
        'Update organization settings',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000029',
        'branches.read',
        'View organization branches',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000030',
        'branches.manage',
        'Create and update organization branches',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE branches
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    status              VARCHAR(30) NOT NULL,

    email               VARCHAR(320),
    phone               VARCHAR(50),

    address_line_1      VARCHAR(250),
    address_line_2      VARCHAR(250),
    city                VARCHAR(100),
    state_province      VARCHAR(100),
    postal_code         VARCHAR(30),
    country_code        VARCHAR(2),

    timezone            VARCHAR(100) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_branches_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT uk_branches_organization_code
        UNIQUE (organization_id, code),

    CONSTRAINT ck_branches_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'ARCHIVED'
            )
        )
);

CREATE UNIQUE INDEX uk_branches_organization_name
    ON branches (
        organization_id,
        LOWER(name)
    );

CREATE INDEX idx_branches_organization_status
    ON branches (
        organization_id,
        status
    );


-- Ensure every existing organization has a terminology
-- configuration without replacing other settings.
UPDATE organizations
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{terminology}',
    COALESCE(
        settings -> 'terminology',
        jsonb_build_object(
            'studentLabel', 'Student',
            'staffLabel', 'Instructor',
            'groupLabel', 'Group',
            'sessionLabel', 'Session',
            'programLabel', 'Program'
        )
    ),
    TRUE
);


-- Existing organization administrators receive the new
-- organization and branch permissions.
INSERT INTO role_permissions
(
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles r
JOIN permissions p
    ON p.code IN (
        'organization.settings.read',
        'organization.settings.update',
        'branches.read',
        'branches.manage'
    )
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


-- Instructors can view branches but cannot manage them.
INSERT INTO role_permissions
(
    role_id,
    permission_id
)
SELECT
    r.id,
    p.id
FROM roles r
JOIN permissions p
    ON p.code = 'branches.read'
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;