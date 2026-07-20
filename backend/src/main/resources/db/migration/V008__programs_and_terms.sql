INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000033',
        'programs.read',
        'View organization programs',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000034',
        'programs.manage',
        'Create and update organization programs',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000035',
        'terms.read',
        'View organization terms',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000036',
        'terms.manage',
        'Create and update organization terms',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE programs
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    category            VARCHAR(100),

    minimum_age         INTEGER,
    maximum_age         INTEGER,

    status              VARCHAR(30) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_programs_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT uk_programs_organization_code
        UNIQUE (organization_id, code),

    CONSTRAINT uk_programs_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_programs_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'ARCHIVED'
            )
        ),

    CONSTRAINT ck_programs_minimum_age
        CHECK (
            minimum_age IS NULL
            OR minimum_age >= 0
        ),

    CONSTRAINT ck_programs_maximum_age
        CHECK (
            maximum_age IS NULL
            OR maximum_age >= 0
        ),

    CONSTRAINT ck_programs_age_range
        CHECK (
            minimum_age IS NULL
            OR maximum_age IS NULL
            OR maximum_age >= minimum_age
        )
);

CREATE UNIQUE INDEX uk_programs_organization_name
    ON programs (
        organization_id,
        LOWER(name)
    );

CREATE INDEX idx_programs_organization_status
    ON programs (
        organization_id,
        status
    );

CREATE INDEX idx_programs_organization_category
    ON programs (
        organization_id,
        category
    );


CREATE TABLE operational_terms
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,

    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,

    status              VARCHAR(30) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_operational_terms_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT uk_terms_organization_code
        UNIQUE (organization_id, code),

    CONSTRAINT uk_terms_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_terms_status
        CHECK (
            status IN (
                'DRAFT',
                'ACTIVE',
                'COMPLETED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT ck_terms_date_range
        CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX uk_terms_organization_name
    ON operational_terms (
        organization_id,
        LOWER(name)
    );

CREATE INDEX idx_terms_organization_status
    ON operational_terms (
        organization_id,
        status
    );

CREATE INDEX idx_terms_organization_dates
    ON operational_terms (
        organization_id,
        start_date,
        end_date
    );


-- Organization administrators receive all program and term
-- management permissions.
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
        'programs.read',
        'programs.manage',
        'terms.read',
        'terms.manage'
    )
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


-- Instructors may view programs and terms.
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
        'programs.read',
        'terms.read'
    )
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
