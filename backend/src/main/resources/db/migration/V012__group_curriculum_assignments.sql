INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000041',
        'group_curricula.read',
        'View group curriculum assignments and progress',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000042',
        'group_curricula.manage',
        'Manage group curriculum assignments and progress',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE group_curriculum_assignments
(
    id                   UUID PRIMARY KEY,
    organization_id      UUID NOT NULL,
    group_id             UUID NOT NULL,
    curriculum_id        UUID NOT NULL,

    status               VARCHAR(30) NOT NULL,

    start_date           DATE NOT NULL,
    end_date             DATE,
    end_reason           VARCHAR(500),

    created_by           UUID NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    version              BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_group_curriculum_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_group_curriculum_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_group_curriculum_curriculum
        FOREIGN KEY (curriculum_id, organization_id)
        REFERENCES curricula (id, organization_id),

    CONSTRAINT fk_group_curriculum_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT uk_group_curriculum_assignment_identity
        UNIQUE (
            id,
            curriculum_id,
            organization_id
        ),

    CONSTRAINT ck_group_curriculum_status
        CHECK (
            status IN (
                'ACTIVE',
                'ENDED',
                'CANCELLED'
            )
        ),

    CONSTRAINT ck_group_curriculum_dates
        CHECK (
            end_date IS NULL
            OR end_date >= start_date
        )
);


CREATE UNIQUE INDEX uk_active_group_curriculum
    ON group_curriculum_assignments
    (
        organization_id,
        group_id
    )
    WHERE status = 'ACTIVE';


CREATE INDEX idx_group_curriculum_group_status
    ON group_curriculum_assignments
    (
        organization_id,
        group_id,
        status
    );


CREATE INDEX idx_group_curriculum_curriculum
    ON group_curriculum_assignments
    (
        organization_id,
        curriculum_id,
        status
    );


CREATE TABLE group_curriculum_unit_progress
(
    id                    UUID PRIMARY KEY,
    organization_id       UUID NOT NULL,
    assignment_id         UUID NOT NULL,
    curriculum_id         UUID NOT NULL,
    unit_id               UUID NOT NULL,

    status                VARCHAR(30) NOT NULL,
    completed_sessions    INTEGER NOT NULL DEFAULT 0,
    completed_at          TIMESTAMP WITH TIME ZONE,

    created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    version               BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_group_unit_progress_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_group_unit_progress_assignment
        FOREIGN KEY (
            assignment_id,
            curriculum_id,
            organization_id
        )
        REFERENCES group_curriculum_assignments (
            id,
            curriculum_id,
            organization_id
        )
        ON DELETE CASCADE,

    CONSTRAINT fk_group_unit_progress_unit
        FOREIGN KEY (
            unit_id,
            curriculum_id,
            organization_id
        )
        REFERENCES curriculum_units (
            id,
            curriculum_id,
            organization_id
        ),

    CONSTRAINT uk_group_unit_progress
        UNIQUE (
            organization_id,
            assignment_id,
            unit_id
        ),

    CONSTRAINT ck_group_unit_progress_status
        CHECK (
            status IN (
                'NOT_STARTED',
                'IN_PROGRESS',
                'COMPLETED'
            )
        ),

    CONSTRAINT ck_group_unit_completed_sessions
        CHECK (completed_sessions >= 0),

    CONSTRAINT ck_group_unit_completion_timestamp
        CHECK (
            status = 'COMPLETED'
            OR completed_at IS NULL
        )
);


CREATE INDEX idx_group_unit_progress_assignment
    ON group_curriculum_unit_progress
    (
        organization_id,
        assignment_id,
        status
    );


CREATE INDEX idx_group_unit_progress_unit
    ON group_curriculum_unit_progress
    (
        organization_id,
        unit_id
    );


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
        'group_curricula.read',
        'group_curricula.manage'
    )
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


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
    ON p.code = 'group_curricula.read'
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
