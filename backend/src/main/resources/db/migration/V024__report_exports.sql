INSERT INTO permissions
(
    id,
    code,
    description,
    created_at
)
VALUES
(
    '00000000-0000-0000-0001-000000000050',
    'reports.export',
    'Generate and download report exports',
    CURRENT_TIMESTAMP
)
ON CONFLICT (code) DO NOTHING;


CREATE TABLE report_exports
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,

    report_type         VARCHAR(50) NOT NULL,
    status              VARCHAR(30) NOT NULL,

    student_id          UUID,
    group_id            UUID,

    date_from           DATE,
    date_to             DATE,

    storage_bucket      VARCHAR(200),
    storage_key         VARCHAR(1000),
    filename            VARCHAR(500),

    content_type        VARCHAR(200),
    file_size           BIGINT,

    requested_by        UUID NOT NULL,
    requested_at        TIMESTAMP WITH TIME ZONE NOT NULL,

    processing_started_at
                        TIMESTAMP WITH TIME ZONE,

    completed_at        TIMESTAMP WITH TIME ZONE,
    failed_at           TIMESTAMP WITH TIME ZONE,

    expires_at          TIMESTAMP WITH TIME ZONE,

    error_message       VARCHAR(2000),

    source_export_id    UUID,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_report_exports_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_report_exports_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id),

    CONSTRAINT fk_report_exports_group
        FOREIGN KEY (group_id, organization_id)
        REFERENCES academy_groups (id, organization_id),

    CONSTRAINT fk_report_exports_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES users (id),

    CONSTRAINT fk_report_exports_source
        FOREIGN KEY (source_export_id)
        REFERENCES report_exports (id),

    CONSTRAINT uk_report_exports_id_org
        UNIQUE (id, organization_id),

    CONSTRAINT uk_report_exports_storage
        UNIQUE (storage_bucket, storage_key),

    CONSTRAINT ck_report_exports_type
        CHECK (
            report_type IN (
                'STUDENT_PROGRESS_PDF'
            )
        ),

    CONSTRAINT ck_report_exports_status
        CHECK (
            status IN (
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'EXPIRED'
            )
        ),

    CONSTRAINT ck_report_exports_dates
        CHECK (
            date_from IS NULL
            OR date_to IS NULL
            OR date_to >= date_from
        ),

    CONSTRAINT ck_report_exports_completed
        CHECK (
            status <> 'COMPLETED'
            OR (
                storage_bucket IS NOT NULL
                AND storage_key IS NOT NULL
                AND filename IS NOT NULL
                AND content_type IS NOT NULL
                AND file_size IS NOT NULL
                AND completed_at IS NOT NULL
                AND expires_at IS NOT NULL
            )
        ),

    CONSTRAINT ck_report_exports_failed
        CHECK (
            status <> 'FAILED'
            OR (
                failed_at IS NOT NULL
                AND error_message IS NOT NULL
            )
        )
);


CREATE INDEX idx_report_exports_organization_status
    ON report_exports
    (
        organization_id,
        status,
        requested_at DESC
    );


CREATE INDEX idx_report_exports_requester
    ON report_exports
    (
        organization_id,
        requested_by,
        requested_at DESC
    );


CREATE INDEX idx_report_exports_student
    ON report_exports
    (
        organization_id,
        student_id,
        requested_at DESC
    )
    WHERE student_id IS NOT NULL;


CREATE INDEX idx_report_exports_expiration
    ON report_exports
    (
        status,
        expires_at
    )
    WHERE status = 'COMPLETED';


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
    ON p.code = 'reports.export'
WHERE r.name IN (
    'ORGANIZATION_ADMIN',
    'INSTRUCTOR',
    'GUARDIAN'
)
ON CONFLICT DO NOTHING;
