INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
(
    '00000000-0000-0000-0001-000000000044',
    'attendance.correct',
    'Reopen and correct finalized attendance',
    CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;


ALTER TABLE attendance_records
    ADD CONSTRAINT uk_attendance_record_id_organization
        UNIQUE (id, organization_id);


CREATE TABLE attendance_correction_batches
(
    id                          UUID PRIMARY KEY,
    organization_id             UUID NOT NULL,
    session_id                  UUID NOT NULL,

    status                      VARCHAR(30) NOT NULL,
    correction_reason           VARCHAR(1000) NOT NULL,

    previous_finalized_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_finalized_by       UUID NOT NULL,

    opened_by                   UUID NOT NULL,
    opened_at                   TIMESTAMP WITH TIME ZONE NOT NULL,

    completed_by                UUID,
    completed_at                TIMESTAMP WITH TIME ZONE,

    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL,
    version                     BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_attendance_correction_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_attendance_correction_session
        FOREIGN KEY (session_id, organization_id)
        REFERENCES lesson_sessions (id, organization_id),

    CONSTRAINT fk_attendance_correction_previous_finalizer
        FOREIGN KEY (previous_finalized_by)
        REFERENCES users (id),

    CONSTRAINT fk_attendance_correction_opened_by
        FOREIGN KEY (opened_by)
        REFERENCES users (id),

    CONSTRAINT fk_attendance_correction_completed_by
        FOREIGN KEY (completed_by)
        REFERENCES users (id),

    CONSTRAINT uk_attendance_correction_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_attendance_correction_status
        CHECK (
            status IN (
                'OPEN',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT ck_attendance_correction_reason
        CHECK (
            LENGTH(TRIM(correction_reason)) > 0
        ),

    CONSTRAINT ck_attendance_correction_completion
        CHECK (
            (
                status = 'OPEN'
                AND completed_by IS NULL
                AND completed_at IS NULL
            )
            OR
            (
                status IN ('COMPLETED', 'CANCELLED')
                AND completed_by IS NOT NULL
                AND completed_at IS NOT NULL
            )
        )
);


CREATE UNIQUE INDEX uk_open_attendance_correction
    ON attendance_correction_batches
    (
        organization_id,
        session_id
    )
    WHERE status = 'OPEN';


CREATE INDEX idx_attendance_corrections_session
    ON attendance_correction_batches
    (
        organization_id,
        session_id,
        opened_at DESC
    );


CREATE TABLE attendance_change_history
(
    id                         UUID PRIMARY KEY,
    organization_id            UUID NOT NULL,
    correction_batch_id        UUID NOT NULL,
    session_id                 UUID NOT NULL,
    attendance_record_id       UUID NOT NULL,
    student_id                 UUID NOT NULL,

    previous_status            VARCHAR(30) NOT NULL,
    new_status                 VARCHAR(30) NOT NULL,

    previous_arrival_time      TIME,
    new_arrival_time           TIME,

    previous_departure_time    TIME,
    new_departure_time         TIME,

    previous_note              VARCHAR(1000),
    new_note                   VARCHAR(1000),

    changed_by                 UUID NOT NULL,
    changed_at                 TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_attendance_history_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_attendance_history_batch
        FOREIGN KEY (
            correction_batch_id,
            organization_id
        )
        REFERENCES attendance_correction_batches (
            id,
            organization_id
        ),

    CONSTRAINT fk_attendance_history_session
        FOREIGN KEY (session_id, organization_id)
        REFERENCES lesson_sessions (id, organization_id),

    CONSTRAINT fk_attendance_history_record
        FOREIGN KEY (
            attendance_record_id,
            organization_id
        )
        REFERENCES attendance_records (
            id,
            organization_id
        ),

    CONSTRAINT fk_attendance_history_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id),

    CONSTRAINT fk_attendance_history_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users (id),

    CONSTRAINT ck_attendance_history_previous_status
        CHECK (
            previous_status IN (
                'NOT_RECORDED',
                'PRESENT',
                'ABSENT',
                'LATE',
                'EXCUSED'
            )
        ),

    CONSTRAINT ck_attendance_history_new_status
        CHECK (
            new_status IN (
                'NOT_RECORDED',
                'PRESENT',
                'ABSENT',
                'LATE',
                'EXCUSED'
            )
        )
);


CREATE INDEX idx_attendance_history_batch
    ON attendance_change_history
    (
        organization_id,
        correction_batch_id,
        changed_at
    );


CREATE INDEX idx_attendance_history_session
    ON attendance_change_history
    (
        organization_id,
        session_id,
        changed_at DESC
    );


CREATE INDEX idx_attendance_history_student
    ON attendance_change_history
    (
        organization_id,
        student_id,
        changed_at DESC
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
    ON p.code = 'attendance.correct'
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
    ON p.code = 'attendance.correct'
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
