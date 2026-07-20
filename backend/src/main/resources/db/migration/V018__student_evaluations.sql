ALTER TABLE evaluation_criteria
    ADD CONSTRAINT uk_evaluation_criteria_identity
        UNIQUE (
            id,
            template_id,
            organization_id
        );


CREATE TABLE student_evaluations
(
    id                   UUID PRIMARY KEY,
    organization_id      UUID NOT NULL,

    student_id           UUID NOT NULL,
    group_id             UUID NOT NULL,
    session_id           UUID,

    template_id          UUID NOT NULL,

    evaluator_user_id    UUID NOT NULL,
    evaluator_staff_id   UUID,

    evaluation_date      DATE NOT NULL,

    overall_score        NUMERIC(10, 2),
    evaluator_comment    TEXT,

    status               VARCHAR(30) NOT NULL,

    submitted_by         UUID,
    submitted_at         TIMESTAMP WITH TIME ZONE,

    published_by         UUID,
    published_at         TIMESTAMP WITH TIME ZONE,

    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    version              BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_student_evaluations_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_student_evaluations_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id),

    CONSTRAINT fk_student_evaluations_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_student_evaluations_session
        FOREIGN KEY (session_id, organization_id)
        REFERENCES lesson_sessions (id, organization_id),

    CONSTRAINT fk_student_evaluations_template
        FOREIGN KEY (template_id, organization_id)
        REFERENCES evaluation_templates (id, organization_id),

    CONSTRAINT fk_student_evaluations_evaluator_user
        FOREIGN KEY (evaluator_user_id)
        REFERENCES users (id),

    CONSTRAINT fk_student_evaluations_evaluator_staff
        FOREIGN KEY (evaluator_staff_id, organization_id)
        REFERENCES staff_members (id, organization_id),

    CONSTRAINT fk_student_evaluations_submitted_by
        FOREIGN KEY (submitted_by)
        REFERENCES users (id),

    CONSTRAINT fk_student_evaluations_published_by
        FOREIGN KEY (published_by)
        REFERENCES users (id),

    CONSTRAINT uk_student_evaluations_id_org
        UNIQUE (id, organization_id),

    CONSTRAINT ck_student_evaluations_status
        CHECK (
            status IN (
                'DRAFT',
                'SUBMITTED',
                'PUBLISHED'
            )
        ),

    CONSTRAINT ck_student_evaluation_submitted
        CHECK (
            status = 'DRAFT'
            OR (
                submitted_by IS NOT NULL
                AND submitted_at IS NOT NULL
            )
        ),

    CONSTRAINT ck_student_evaluation_published
        CHECK (
            status <> 'PUBLISHED'
            OR (
                published_by IS NOT NULL
                AND published_at IS NOT NULL
            )
        )
);


CREATE INDEX idx_student_evaluations_student_date
    ON student_evaluations
    (
        organization_id,
        student_id,
        evaluation_date DESC
    );


CREATE INDEX idx_student_evaluations_group_date
    ON student_evaluations
    (
        organization_id,
        group_id,
        evaluation_date DESC
    );


CREATE INDEX idx_student_evaluations_session
    ON student_evaluations
    (
        organization_id,
        session_id
    )
    WHERE session_id IS NOT NULL;


CREATE INDEX idx_student_evaluations_template
    ON student_evaluations
    (
        organization_id,
        template_id,
        status
    );


CREATE INDEX idx_student_evaluations_evaluator
    ON student_evaluations
    (
        organization_id,
        evaluator_user_id,
        evaluation_date DESC
    );


CREATE TABLE student_evaluation_scores
(
    id                   UUID PRIMARY KEY,
    organization_id      UUID NOT NULL,

    evaluation_id        UUID NOT NULL,
    template_id          UUID NOT NULL,
    criterion_id         UUID NOT NULL,

    score                NUMERIC(10, 2) NOT NULL,
    weighted_score       NUMERIC(10, 2) NOT NULL,

    evaluator_comment    VARCHAR(2000),

    created_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    version              BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_evaluation_scores_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_evaluation_scores_evaluation
        FOREIGN KEY (evaluation_id, organization_id)
        REFERENCES student_evaluations (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_scores_criterion
        FOREIGN KEY (
            criterion_id,
            template_id,
            organization_id
        )
        REFERENCES evaluation_criteria (
            id,
            template_id,
            organization_id
        ),

    CONSTRAINT uk_evaluation_score_criterion
        UNIQUE (
            organization_id,
            evaluation_id,
            criterion_id
        )
);


CREATE INDEX idx_evaluation_scores_evaluation
    ON student_evaluation_scores
    (
        organization_id,
        evaluation_id
    );


CREATE INDEX idx_evaluation_scores_criterion
    ON student_evaluation_scores
    (
        organization_id,
        criterion_id
    );
