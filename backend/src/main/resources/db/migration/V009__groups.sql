-- Required for composite tenant-safe foreign keys.
ALTER TABLE branches
    ADD CONSTRAINT uk_branches_id_organization
        UNIQUE (id, organization_id);


CREATE TABLE academy_groups
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,

    branch_id           UUID,
    program_id          UUID NOT NULL,
    term_id             UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,

    capacity            INTEGER NOT NULL,
    minimum_age         INTEGER,
    maximum_age         INTEGER,

    status              VARCHAR(30) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_groups_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_groups_branch
        FOREIGN KEY (branch_id, organization_id)
        REFERENCES branches (id, organization_id),

    CONSTRAINT fk_groups_program
        FOREIGN KEY (program_id, organization_id)
        REFERENCES programs (id, organization_id),

    CONSTRAINT fk_groups_term
        FOREIGN KEY (term_id, organization_id)
        REFERENCES operational_terms (id, organization_id),

    CONSTRAINT uk_groups_organization_code
        UNIQUE (organization_id, code),

    CONSTRAINT uk_groups_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_groups_capacity
        CHECK (capacity > 0),

    CONSTRAINT ck_groups_minimum_age
        CHECK (
            minimum_age IS NULL
            OR minimum_age >= 0
        ),

    CONSTRAINT ck_groups_maximum_age
        CHECK (
            maximum_age IS NULL
            OR maximum_age >= 0
        ),

    CONSTRAINT ck_groups_age_range
        CHECK (
            minimum_age IS NULL
            OR maximum_age IS NULL
            OR maximum_age >= minimum_age
        ),

    CONSTRAINT ck_groups_status
        CHECK (
            status IN (
                'DRAFT',
                'ACTIVE',
                'INACTIVE',
                'COMPLETED',
                'ARCHIVED'
            )
        )
);


CREATE UNIQUE INDEX uk_groups_organization_name_term
    ON academy_groups
    (
        organization_id,
        term_id,
        LOWER(name)
    );


CREATE INDEX idx_groups_organization_status
    ON academy_groups
    (
        organization_id,
        status
    );


CREATE INDEX idx_groups_organization_program
    ON academy_groups
    (
        organization_id,
        program_id
    );


CREATE INDEX idx_groups_organization_term
    ON academy_groups
    (
        organization_id,
        term_id
    );


CREATE INDEX idx_groups_organization_branch
    ON academy_groups
    (
        organization_id,
        branch_id
    );
