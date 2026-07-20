INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0001-000000000046',
        'media.read',
        'View authorized media files',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000047',
        'media.upload',
        'Upload media files',
        CURRENT_TIMESTAMP
    ),
    (
        '00000000-0000-0000-0001-000000000048',
        'media.delete',
        'Delete media files',
        CURRENT_TIMESTAMP
    )
ON CONFLICT (code) DO NOTHING;


CREATE TABLE media_files
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,

    storage_bucket      VARCHAR(200) NOT NULL,
    storage_key         VARCHAR(1000) NOT NULL,

    original_filename   VARCHAR(500) NOT NULL,
    content_type        VARCHAR(200) NOT NULL,

    media_type          VARCHAR(30) NOT NULL,
    status              VARCHAR(30) NOT NULL,

    expected_size       BIGINT NOT NULL,
    actual_size         BIGINT,

    title               VARCHAR(200),
    description         TEXT,

    uploaded_by         UUID NOT NULL,
    upload_completed_at TIMESTAMP WITH TIME ZONE,

    deleted_by          UUID,
    deleted_at          TIMESTAMP WITH TIME ZONE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_media_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_media_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users (id),

    CONSTRAINT fk_media_deleted_by
        FOREIGN KEY (deleted_by)
        REFERENCES users (id),

    CONSTRAINT uk_media_storage_object
        UNIQUE (storage_bucket, storage_key),

    CONSTRAINT uk_media_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_media_type
        CHECK (
            media_type IN (
                'IMAGE',
                'VIDEO',
                'DOCUMENT'
            )
        ),

    CONSTRAINT ck_media_status
        CHECK (
            status IN (
                'PENDING',
                'AVAILABLE',
                'FAILED',
                'DELETED'
            )
        ),

    CONSTRAINT ck_media_expected_size
        CHECK (expected_size > 0),

    CONSTRAINT ck_media_actual_size
        CHECK (
            actual_size IS NULL
            OR actual_size >= 0
        ),

    CONSTRAINT ck_media_completed
        CHECK (
            status <> 'AVAILABLE'
            OR (
                actual_size IS NOT NULL
                AND upload_completed_at IS NOT NULL
            )
        ),

    CONSTRAINT ck_media_deleted
        CHECK (
            status <> 'DELETED'
            OR (
                deleted_by IS NOT NULL
                AND deleted_at IS NOT NULL
            )
        )
);


CREATE INDEX idx_media_organization_status
    ON media_files
    (
        organization_id,
        status,
        created_at DESC
    );


CREATE INDEX idx_media_organization_type
    ON media_files
    (
        organization_id,
        media_type,
        created_at DESC
    );


CREATE INDEX idx_media_uploader
    ON media_files
    (
        organization_id,
        uploaded_by,
        created_at DESC
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
        'media.read',
        'media.upload',
        'media.delete'
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
    ON p.code IN (
        'media.read',
        'media.upload'
    )
WHERE r.name = 'INSTRUCTOR'
ON CONFLICT DO NOTHING;
