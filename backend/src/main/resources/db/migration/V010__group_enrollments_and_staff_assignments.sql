INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000037',
        'enrollments.read',
        'View group student enrollments',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000038',
        'enrollments.manage',
        'Manage group student enrollments',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000039',
        'group_staff.read',
        'View group staff assignments',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000040',
        'group_staff.manage',
        'Manage group staff assignments',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


-- Required by tenant-safe composite foreign keys.
ALTER TABLE staff_members
    ADD CONSTRAINT uk_staff_id_organization
        UNIQUE (id, organization_id);


CREATE TABLE group_enrollments
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    group_id            UUID NOT NULL,
    student_id          UUID NOT NULL,

    status              VARCHAR(30) NOT NULL,
    enrolled_at         DATE NOT NULL,
    ended_at            DATE,
    end_reason          VARCHAR(500),

    created_by          UUID NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_group_enrollments_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_group_enrollments_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_group_enrollments_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id),

    CONSTRAINT fk_group_enrollments_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT ck_group_enrollments_status
        CHECK (
            status IN (
                'ACTIVE',
                'COMPLETED',
                'WITHDRAWN',
                'CANCELLED'
            )
        ),

    CONSTRAINT ck_group_enrollments_dates
        CHECK (
            ended_at IS NULL
            OR ended_at >= enrolled_at
        )
);


CREATE UNIQUE INDEX uk_active_group_student_enrollment
    ON group_enrollments
    (
        organization_id,
        group_id,
        student_id
    )
    WHERE status = 'ACTIVE';


CREATE INDEX idx_group_enrollments_group_status
    ON group_enrollments
    (
        organization_id,
        group_id,
        status
    );


CREATE INDEX idx_group_enrollments_student
    ON group_enrollments
    (
        organization_id,
        student_id,
        status
    );


CREATE TABLE group_staff_assignments
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    group_id            UUID NOT NULL,
    staff_id            UUID NOT NULL,

    assignment_role     VARCHAR(30) NOT NULL,
    status              VARCHAR(30) NOT NULL,

    start_date          DATE NOT NULL,
    end_date            DATE,
    end_reason          VARCHAR(500),

    created_by          UUID NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_group_staff_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_group_staff_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_group_staff_staff
        FOREIGN KEY (staff_id, organization_id)
        REFERENCES staff_members (id, organization_id),

    CONSTRAINT fk_group_staff_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id),

    CONSTRAINT ck_group_staff_role
        CHECK (
            assignment_role IN (
                'PRIMARY_INSTRUCTOR',
                'ASSISTANT_INSTRUCTOR'
            )
        ),

    CONSTRAINT ck_group_staff_status
        CHECK (
            status IN (
                'ACTIVE',
                'ENDED',
                'CANCELLED'
            )
        ),

    CONSTRAINT ck_group_staff_dates
        CHECK (
            end_date IS NULL
            OR end_date >= start_date
        )
);


CREATE UNIQUE INDEX uk_active_group_staff_assignment
    ON group_staff_assignments
    (
        organization_id,
        group_id,
        staff_id
    )
    WHERE status = 'ACTIVE';


CREATE UNIQUE INDEX uk_active_primary_instructor
    ON group_staff_assignments
    (
        organization_id,
        group_id
    )
    WHERE status = 'ACTIVE'
      AND assignment_role = 'PRIMARY_INSTRUCTOR';


CREATE INDEX idx_group_staff_group_status
    ON group_staff_assignments
    (
        organization_id,
        group_id,
        status
    );


CREATE INDEX idx_group_staff_staff_status
    ON group_staff_assignments
    (
        organization_id,
        staff_id,
        status
    );


-- Existing administrators receive all new permissions.
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
        'enrollments.read',
        'enrollments.manage',
        'group_staff.read',
        'group_staff.manage'
    )
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


-- Instructors can view group enrollment and assignment data.
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
        'enrollments.read',
        'group_staff.read'
    )
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
