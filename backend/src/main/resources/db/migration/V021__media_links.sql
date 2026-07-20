INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
(
    '00000000-0000-0000-0001-000000000049',
    'media.link',
    'Link and unlink media from authorized entities',
    CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;


CREATE TABLE media_links
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    media_id            UUID NOT NULL,

    student_id          UUID,
    group_id            UUID,
    session_id          UUID,
    evaluation_id       UUID,

    caption             VARCHAR(1000),
    cover_media         BOOLEAN NOT NULL DEFAULT FALSE,

    linked_by           UUID NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_media_links_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_media_links_media
        FOREIGN KEY (media_id, organization_id)
        REFERENCES media_files (id, organization_id),

    CONSTRAINT fk_media_links_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_media_links_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_media_links_session
        FOREIGN KEY (session_id, organization_id)
        REFERENCES lesson_sessions (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_media_links_evaluation
        FOREIGN KEY (evaluation_id, organization_id)
        REFERENCES student_evaluations (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_media_links_linked_by
        FOREIGN KEY (linked_by)
        REFERENCES users (id),

    CONSTRAINT ck_media_links_single_target
        CHECK (
            num_nonnulls(
                student_id,
                group_id,
                session_id,
                evaluation_id
            ) = 1
        )
);


CREATE UNIQUE INDEX uk_media_link_student
    ON media_links
    (
        organization_id,
        media_id,
        student_id
    )
    WHERE student_id IS NOT NULL;


CREATE UNIQUE INDEX uk_media_link_group
    ON media_links
    (
        organization_id,
        media_id,
        group_id
    )
    WHERE group_id IS NOT NULL;


CREATE UNIQUE INDEX uk_media_link_session
    ON media_links
    (
        organization_id,
        media_id,
        session_id
    )
    WHERE session_id IS NOT NULL;


CREATE UNIQUE INDEX uk_media_link_evaluation
    ON media_links
    (
        organization_id,
        media_id,
        evaluation_id
    )
    WHERE evaluation_id IS NOT NULL;


CREATE UNIQUE INDEX uk_student_cover_media
    ON media_links
    (
        organization_id,
        student_id
    )
    WHERE student_id IS NOT NULL
      AND cover_media = TRUE;


CREATE UNIQUE INDEX uk_group_cover_media
    ON media_links
    (
        organization_id,
        group_id
    )
    WHERE group_id IS NOT NULL
      AND cover_media = TRUE;


CREATE UNIQUE INDEX uk_session_cover_media
    ON media_links
    (
        organization_id,
        session_id
    )
    WHERE session_id IS NOT NULL
      AND cover_media = TRUE;


CREATE UNIQUE INDEX uk_evaluation_cover_media
    ON media_links
    (
        organization_id,
        evaluation_id
    )
    WHERE evaluation_id IS NOT NULL
      AND cover_media = TRUE;


CREATE INDEX idx_media_links_media
    ON media_links
    (
        organization_id,
        media_id
    );


CREATE INDEX idx_media_links_student
    ON media_links
    (
        organization_id,
        student_id,
        created_at DESC
    )
    WHERE student_id IS NOT NULL;


CREATE INDEX idx_media_links_group
    ON media_links
    (
        organization_id,
        group_id,
        created_at DESC
    )
    WHERE group_id IS NOT NULL;


CREATE INDEX idx_media_links_session
    ON media_links
    (
        organization_id,
        session_id,
        created_at DESC
    )
    WHERE session_id IS NOT NULL;


CREATE INDEX idx_media_links_evaluation
    ON media_links
    (
        organization_id,
        evaluation_id,
        created_at DESC
    )
    WHERE evaluation_id IS NOT NULL;


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
    ON p.code = 'media.link'
WHERE r.name IN (
    'ORGANIZATION_ADMIN',
    'INSTRUCTOR'
)
ON CONFLICT DO NOTHING;
