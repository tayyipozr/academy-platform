INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000031',
        'guardians.read',
        'View guardian profiles',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000032',
        'guardians.manage',
        'Create and update guardian profiles',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE staff_members
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    membership_id       UUID NOT NULL,
    branch_id           UUID,

    staff_number        VARCHAR(50) NOT NULL,
    title               VARCHAR(100),
    specialization      VARCHAR(200),
    employment_status   VARCHAR(30) NOT NULL,
    biography           TEXT,

    hired_at            DATE,
    ended_at            DATE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_staff_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_staff_membership
        FOREIGN KEY (membership_id)
        REFERENCES organization_memberships (id),

    CONSTRAINT fk_staff_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches (id),

    CONSTRAINT uk_staff_organization_membership
        UNIQUE (organization_id, membership_id),

    CONSTRAINT uk_staff_organization_number
        UNIQUE (organization_id, staff_number),

    CONSTRAINT ck_staff_employment_status
        CHECK (
            employment_status IN (
                'ACTIVE',
                'ON_LEAVE',
                'INACTIVE',
                'ARCHIVED'
            )
        ),

    CONSTRAINT ck_staff_employment_dates
        CHECK (
            ended_at IS NULL
            OR hired_at IS NULL
            OR ended_at >= hired_at
        )
);

CREATE INDEX idx_staff_organization_status
    ON staff_members (
        organization_id,
        employment_status
    );

CREATE INDEX idx_staff_organization_branch
    ON staff_members (
        organization_id,
        branch_id
    );

CREATE INDEX idx_staff_membership
    ON staff_members (membership_id);


CREATE TABLE guardians
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    membership_id       UUID NOT NULL,

    guardian_number     VARCHAR(50),
    phone               VARCHAR(50),
    alternate_phone     VARCHAR(50),
    occupation          VARCHAR(150),

    address_line_1      VARCHAR(250),
    address_line_2      VARCHAR(250),
    city                VARCHAR(100),
    state_province      VARCHAR(100),
    postal_code         VARCHAR(30),
    country_code        VARCHAR(2),

    status              VARCHAR(30) NOT NULL,
    notes               TEXT,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_guardians_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_guardians_membership
        FOREIGN KEY (membership_id)
        REFERENCES organization_memberships (id),

    CONSTRAINT uk_guardians_organization_membership
        UNIQUE (organization_id, membership_id),

    CONSTRAINT uk_guardians_organization_number
        UNIQUE (organization_id, guardian_number),

    CONSTRAINT ck_guardians_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'ARCHIVED'
            )
        )
);

CREATE INDEX idx_guardians_organization_status
    ON guardians (
        organization_id,
        status
    );

CREATE INDEX idx_guardians_membership
    ON guardians (membership_id);


-- Existing organization administrators receive the new
-- guardian permissions.
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
        'guardians.read',
        'guardians.manage'
    )
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


-- Guardian accounts may view their own guardian-related
-- portal information. Record-level ownership checks will
-- be added with student relationships in Step 4C.
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
    ON p.code = 'guardians.read'
WHERE r.name = 'GUARDIAN'
ON CONFLICT DO NOTHING;
