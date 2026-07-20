CREATE INDEX idx_sessions_finalized_attendance_date
    ON lesson_sessions
    (
        organization_id,
        attendance_finalized_at,
        scheduled_start
    )
    WHERE attendance_finalized_at IS NOT NULL;


CREATE INDEX idx_attendance_student_session
    ON attendance_records
    (
        organization_id,
        student_id,
        session_id
    );


CREATE INDEX idx_attendance_session_student_status
    ON attendance_records
    (
        organization_id,
        session_id,
        student_id,
        status
    );
