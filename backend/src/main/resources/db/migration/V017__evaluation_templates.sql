CREATE TABLE evaluation_templates
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    program_id          UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,
    version_label       VARCHAR(50) NOT NULL,

    minimum_score       NUMERIC(10, 2) NOT NULL,
    maximum_score       NUMERIC(10, 2) NOT NULL,
    passing_score       NUMERIC(10, 2),

    status              VARCHAR(30) NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_evaluation_templates_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_evaluation_templates_program
        FOREIGN KEY (program_id, organization_id)
        REFERENCES programs (id, organization_id),

    CONSTRAINT uk_evaluation_templates_org_code
        UNIQUE (organization_id, code),

    CONSTRAINT uk_evaluation_templates_id_org
        UNIQUE (id, organization_id),

    CONSTRAINT ck_evaluation_template_range
        CHECK (maximum_score > minimum_score),

    CONSTRAINT ck_evaluation_template_passing_score
        CHECK (
            passing_score IS NULL
            OR (
                passing_score >= minimum_score
                AND passing_score <= maximum_score
            )
        ),

    CONSTRAINT ck_evaluation_template_status
        CHECK (
            status IN (
                'DRAFT',
                'ACTIVE',
                'ARCHIVED'
            )
        )
);


CREATE UNIQUE INDEX uk_evaluation_template_program_version
    ON evaluation_templates
    (
        organization_id,
        program_id,
        LOWER(name),
        LOWER(version_label)
    );


CREATE INDEX idx_evaluation_template_org_program
    ON evaluation_templates
    (
        organization_id,
        program_id,
        status
    );


CREATE TABLE evaluation_criteria
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    template_id         UUID NOT NULL,

    code                VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    description         TEXT,

    weight_percentage   NUMERIC(5, 2) NOT NULL,
    sequence_number     INTEGER NOT NULL,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_evaluation_criteria_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_evaluation_criteria_template
        FOREIGN KEY (template_id, organization_id)
        REFERENCES evaluation_templates (
            id,
            organization_id
        )
        ON DELETE CASCADE,

    CONSTRAINT uk_evaluation_criteria_org_code
        UNIQUE (
            organization_id,
            template_id,
            code
        ),

    CONSTRAINT uk_evaluation_criteria_sequence
        UNIQUE (
            organization_id,
            template_id,
            sequence_number
        ),

    CONSTRAINT ck_evaluation_criteria_weight
        CHECK (
            weight_percentage > 0
            AND weight_percentage <= 100
        ),

    CONSTRAINT ck_evaluation_criteria_sequence
        CHECK (sequence_number > 0)
);


CREATE INDEX idx_evaluation_criteria_template
    ON evaluation_criteria
    (
        organization_id,
        template_id,
        sequence_number
    );
