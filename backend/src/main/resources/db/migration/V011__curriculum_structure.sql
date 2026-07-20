CREATE TABLE curricula
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    program_id          UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    version_label       VARCHAR(50) NOT NULL,

    status              VARCHAR(30) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_curricula_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_curricula_program
        FOREIGN KEY (program_id, organization_id)
        REFERENCES programs (id, organization_id),

    CONSTRAINT uk_curricula_organization_code
        UNIQUE (organization_id, code),

    CONSTRAINT uk_curricula_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_curricula_status
        CHECK (
            status IN (
                'DRAFT',
                'ACTIVE',
                'ARCHIVED'
            )
        )
);

CREATE UNIQUE INDEX uk_curricula_program_name_version
    ON curricula
    (
        organization_id,
        program_id,
        LOWER(name),
        LOWER(version_label)
    );

CREATE INDEX idx_curricula_organization_status
    ON curricula
    (
        organization_id,
        status
    );

CREATE INDEX idx_curricula_organization_program
    ON curricula
    (
        organization_id,
        program_id
    );


CREATE TABLE curriculum_units
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    curriculum_id       UUID NOT NULL,
    parent_unit_id      UUID,

    code                VARCHAR(50) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,

    sequence_number     INTEGER NOT NULL,
    estimated_sessions  INTEGER,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_curriculum_units_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_curriculum_units_curriculum
        FOREIGN KEY (curriculum_id, organization_id)
        REFERENCES curricula (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT uk_curriculum_units_identity
        UNIQUE (
            id,
            curriculum_id,
            organization_id
        ),

    CONSTRAINT uk_curriculum_units_code
        UNIQUE (
            organization_id,
            curriculum_id,
            code
        ),

    CONSTRAINT uk_curriculum_units_sequence
        UNIQUE (
            organization_id,
            curriculum_id,
            sequence_number
        ),

    CONSTRAINT ck_curriculum_units_sequence
        CHECK (sequence_number > 0),

    CONSTRAINT ck_curriculum_units_estimated_sessions
        CHECK (
            estimated_sessions IS NULL
            OR estimated_sessions > 0
        )
);


ALTER TABLE curriculum_units
    ADD CONSTRAINT fk_curriculum_units_parent
        FOREIGN KEY (
            parent_unit_id,
            curriculum_id,
            organization_id
        )
        REFERENCES curriculum_units (
            id,
            curriculum_id,
            organization_id
        );


CREATE INDEX idx_curriculum_units_curriculum
    ON curriculum_units
    (
        organization_id,
        curriculum_id,
        sequence_number
    );

CREATE INDEX idx_curriculum_units_parent
    ON curriculum_units
    (
        organization_id,
        parent_unit_id
    );


CREATE TABLE learning_outcomes
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    curriculum_id       UUID NOT NULL,
    unit_id             UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    sequence_number     INTEGER NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_learning_outcomes_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_learning_outcomes_curriculum
        FOREIGN KEY (curriculum_id, organization_id)
        REFERENCES curricula (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_learning_outcomes_unit
        FOREIGN KEY (
            unit_id,
            curriculum_id,
            organization_id
        )
        REFERENCES curriculum_units (
            id,
            curriculum_id,
            organization_id
        )
        ON DELETE CASCADE,

    CONSTRAINT uk_learning_outcomes_code
        UNIQUE (
            organization_id,
            curriculum_id,
            code
        ),

    CONSTRAINT uk_learning_outcomes_sequence
        UNIQUE (
            organization_id,
            unit_id,
            sequence_number
        ),

    CONSTRAINT ck_learning_outcomes_sequence
        CHECK (sequence_number > 0)
);


CREATE INDEX idx_learning_outcomes_unit
    ON learning_outcomes
    (
        organization_id,
        unit_id,
        sequence_number
    );

CREATE INDEX idx_learning_outcomes_curriculum
    ON learning_outcomes
    (
        organization_id,
        curriculum_id
    );
