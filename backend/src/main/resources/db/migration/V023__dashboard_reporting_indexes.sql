CREATE INDEX idx_students_active_organization
    ON students (
        organization_id,
        status
    )
    WHERE status = 'ACTIVE';


CREATE INDEX idx_groups_active_organization
    ON academy_groups (
        organization_id,
        status
    )
    WHERE status IN ('DRAFT', 'ACTIVE');


CREATE INDEX idx_sessions_upcoming
    ON lesson_sessions (
        organization_id,
        scheduled_start,
        status
    )
    WHERE status IN (
        'SCHEDULED',
        'IN_PROGRESS',
        'POSTPONED'
    );


CREATE INDEX idx_sessions_missing_attendance
    ON lesson_sessions (
        organization_id,
        group_id,
        scheduled_start
    )
    WHERE attendance_finalized_at IS NULL
      AND status IN (
          'SCHEDULED',
          'IN_PROGRESS',
          'COMPLETED'
      );


CREATE INDEX idx_evaluations_pending_publication
    ON student_evaluations (
        organization_id,
        status,
        submitted_at
    )
    WHERE status = 'SUBMITTED';


CREATE INDEX idx_group_enrollments_active_reporting
    ON group_enrollments (
        organization_id,
        group_id,
        student_id
    )
    WHERE status = 'ACTIVE';
