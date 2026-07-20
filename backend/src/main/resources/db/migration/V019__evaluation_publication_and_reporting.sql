INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
(
    '00000000-0000-0000-0001-000000000045',
    'evaluations.publish',
    'Publish submitted student evaluations',
    CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;


-- Publication is intentionally restricted to organization
-- administrators. Instructors submit evaluations; authorized
-- administrators publish them.
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
    ON p.code = 'evaluations.publish'
WHERE r.name = 'ORGANIZATION_ADMIN'
ON CONFLICT DO NOTHING;


CREATE INDEX idx_student_evaluations_published_student
    ON student_evaluations
    (
        organization_id,
        student_id,
        evaluation_date DESC
    )
    WHERE status = 'PUBLISHED';


CREATE INDEX idx_student_evaluations_published_group
    ON student_evaluations
    (
        organization_id,
        group_id,
        evaluation_date DESC
    )
    WHERE status = 'PUBLISHED';


CREATE INDEX idx_student_evaluations_published_template
    ON student_evaluations
    (
        organization_id,
        template_id,
        evaluation_date DESC
    )
    WHERE status = 'PUBLISHED';


CREATE INDEX idx_evaluation_scores_reporting
    ON student_evaluation_scores
    (
        organization_id,
        evaluation_id,
        criterion_id
    );
