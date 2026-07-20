INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000043',
        'attendance.finalize',
        'Finalize attendance for a lesson session',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


ALTER TABLE lesson_sessions
    ADD COLUMN attendance_finalized_at
        TIMESTAMP WITH TIME ZONE,

    ADD COLUMN attendance_finalized_by
        UUID,

    ADD CONSTRAINT fk_sessions_attendance_finalized_by
        FOREIGN KEY (attendance_finalized_by)
        REFERENCES users (id),

    ADD CONSTRAINT ck_sessions_attendance_finalization
        CHECK (
            (
                attendance_finalized_at IS NULL
                AND attendance_finalized_by IS NULL
            )
            OR
            (
                attendance_finalized_at IS NOT NULL
                AND attendance_finalized_by IS NOT NULL
            )
        );


CREATE TABLE attendance_records
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    session_id          UUID NOT NULL,
    student_id          UUID NOT NULL,

    status              VARCHAR(30) NOT NULL,

    arrival_time        TIME,
    departure_time      TIME,
    note                VARCHAR(1000),

    recorded_by         UUID,
    recorded_at         TIMESTAMP WITH TIME ZONE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_attendance_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id, organization_id)
        REFERENCES lesson_sessions (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id),

    CONSTRAINT fk_attendance_recorded_by
        FOREIGN KEY (recorded_by)
        REFERENCES users (id),

    CONSTRAINT uk_attendance_session_student
        UNIQUE (
            organization_id,
            session_id,
            student_id
        ),

    CONSTRAINT ck_attendance_status
        CHECK (
            status IN (
                'NOT_RECORDED',
                'PRESENT',
                'ABSENT',
                'LATE',
                'EXCUSED'
            )
        ),

    CONSTRAINT ck_attendance_recorded_fields
        CHECK (
            status = 'NOT_RECORDED'
            OR (
                recorded_by IS NOT NULL
                AND recorded_at IS NOT NULL
            )
        ),

    CONSTRAINT ck_attendance_times
        CHECK (
            departure_time IS NULL
            OR arrival_time IS NULL
            OR departure_time >= arrival_time
        )
);


CREATE INDEX idx_attendance_session
    ON attendance_records
    (
        organization_id,
        session_id,
        status
    );


CREATE INDEX idx_attendance_student
    ON attendance_records
    (
        organization_id,
        student_id,
        status
    );


CREATE INDEX idx_attendance_recorded_at
    ON attendance_records
    (
        organization_id,
        recorded_at
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
    ON p.code = 'attendance.finalize'
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
    ON p.code = 'attendance.finalize'
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
