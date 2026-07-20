ALTER TABLE group_curriculum_assignments
    ADD CONSTRAINT uk_group_curriculum_assignment_id_org
        UNIQUE (id, organization_id);


CREATE TABLE schedule_rules
(
    id                       UUID PRIMARY KEY,
    organization_id          UUID NOT NULL,
    group_id                 UUID NOT NULL,

    curriculum_assignment_id UUID,
    curriculum_id            UUID,
    curriculum_unit_id       UUID,
    lead_staff_id            UUID,

    title                    VARCHAR(200) NOT NULL,
    description              TEXT,

    day_of_week              INTEGER NOT NULL,
    start_time               TIME NOT NULL,
    end_time                 TIME NOT NULL,

    effective_from           DATE NOT NULL,
    effective_until          DATE NOT NULL,

    timezone                 VARCHAR(100) NOT NULL,
    location                 VARCHAR(250),

    status                   VARCHAR(30) NOT NULL,

    created_by               UUID NOT NULL,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    version                  BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_schedule_rules_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_schedule_rules_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_schedule_rules_assignment
        FOREIGN KEY (
            curriculum_assignment_id,
            organization_id
        )
        REFERENCES group_curriculum_assignments (
            id,
            organization_id
        ),

    CONSTRAINT fk_schedule_rules_unit
        FOREIGN KEY (
            curriculum_unit_id,
            curriculum_id,
            organization_id
        )
        REFERENCES curriculum_units (
            id,
            curriculum_id,
            organization_id
        ),

    CONSTRAINT fk_schedule_rules_staff
        FOREIGN KEY (lead_staff_id, organization_id)
        REFERENCES staff_members (id, organization_id),

    CONSTRAINT fk_schedule_rules_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT uk_schedule_rules_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_schedule_rules_day
        CHECK (day_of_week BETWEEN 1 AND 7),

    CONSTRAINT ck_schedule_rules_time
        CHECK (end_time > start_time),

    CONSTRAINT ck_schedule_rules_dates
        CHECK (effective_until >= effective_from),

    CONSTRAINT ck_schedule_rules_curriculum_reference
        CHECK (
            (
                curriculum_assignment_id IS NULL
                AND curriculum_id IS NULL
                AND curriculum_unit_id IS NULL
            )
            OR
            (
                curriculum_assignment_id IS NOT NULL
                AND curriculum_id IS NOT NULL
            )
        ),

    CONSTRAINT ck_schedule_rules_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'ARCHIVED'
            )
        )
);


CREATE INDEX idx_schedule_rules_group
    ON schedule_rules (
        organization_id,
        group_id,
        status
    );


CREATE INDEX idx_schedule_rules_effective_dates
    ON schedule_rules (
        organization_id,
        effective_from,
        effective_until
    );


CREATE TABLE lesson_sessions
(
    id                       UUID PRIMARY KEY,
    organization_id          UUID NOT NULL,
    group_id                 UUID NOT NULL,

    schedule_rule_id         UUID,

    curriculum_assignment_id UUID,
    curriculum_id            UUID,
    curriculum_unit_id       UUID,
    lead_staff_id            UUID,

    title                    VARCHAR(200) NOT NULL,
    description              TEXT,

    scheduled_start          TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end            TIMESTAMP WITH TIME ZONE NOT NULL,

    location                 VARCHAR(250),

    status                   VARCHAR(30) NOT NULL,
    completion_notes         TEXT,
    cancellation_reason      VARCHAR(500),

    completed_at             TIMESTAMP WITH TIME ZONE,
    cancelled_at             TIMESTAMP WITH TIME ZONE,

    created_by               UUID NOT NULL,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    version                  BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_sessions_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_sessions_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_sessions_schedule_rule
        FOREIGN KEY (schedule_rule_id, organization_id)
        REFERENCES schedule_rules (id, organization_id),

    CONSTRAINT fk_sessions_assignment
        FOREIGN KEY (
            curriculum_assignment_id,
            organization_id
        )
        REFERENCES group_curriculum_assignments (
            id,
            organization_id
        ),

    CONSTRAINT fk_sessions_unit
        FOREIGN KEY (
            curriculum_unit_id,
            curriculum_id,
            organization_id
        )
        REFERENCES curriculum_units (
            id,
            curriculum_id,
            organization_id
        ),

    CONSTRAINT fk_sessions_staff
        FOREIGN KEY (lead_staff_id, organization_id)
        REFERENCES staff_members (id, organization_id),

    CONSTRAINT fk_sessions_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT uk_sessions_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_sessions_time
        CHECK (scheduled_end > scheduled_start),

    CONSTRAINT ck_sessions_status
        CHECK (
            status IN (
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'POSTPONED'
            )
        ),

    CONSTRAINT ck_sessions_curriculum_reference
        CHECK (
            (
                curriculum_assignment_id IS NULL
                AND curriculum_id IS NULL
                AND curriculum_unit_id IS NULL
            )
            OR
            (
                curriculum_assignment_id IS NOT NULL
                AND curriculum_id IS NOT NULL
            )
        ),

    CONSTRAINT ck_sessions_completed
        CHECK (
            status = 'COMPLETED'
            OR completed_at IS NULL
        ),

    CONSTRAINT ck_sessions_cancelled
        CHECK (
            status = 'CANCELLED'
            OR cancelled_at IS NULL
        )
);


CREATE UNIQUE INDEX uk_generated_schedule_session
    ON lesson_sessions (
        organization_id,
        schedule_rule_id,
        scheduled_start
    )
    WHERE schedule_rule_id IS NOT NULL;


CREATE UNIQUE INDEX uk_group_session_time
    ON lesson_sessions (
        organization_id,
        group_id,
        scheduled_start
    )
    WHERE status <> 'CANCELLED';


CREATE INDEX idx_sessions_group_start
    ON lesson_sessions (
        organization_id,
        group_id,
        scheduled_start
    );


CREATE INDEX idx_sessions_staff_start
    ON lesson_sessions (
        organization_id,
        lead_staff_id,
        scheduled_start
    );


CREATE INDEX idx_sessions_status_start
    ON lesson_sessions (
        organization_id,
        status,
        scheduled_start
    );


CREATE INDEX idx_sessions_curriculum_unit
    ON lesson_sessions (
        organization_id,
        curriculum_unit_id
    );
