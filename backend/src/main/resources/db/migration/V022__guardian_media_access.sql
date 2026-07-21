ALTER TABLE media_links
    ADD COLUMN purpose VARCHAR(30)
        NOT NULL DEFAULT 'INTERNAL';


ALTER TABLE media_links
    ADD CONSTRAINT ck_media_links_purpose
        CHECK (
            purpose IN (
                'INTERNAL',
                'MARKETING'
            )
        );


CREATE INDEX idx_media_links_purpose
    ON media_links
    (
        organization_id,
        purpose,
        created_at DESC
    );


CREATE INDEX idx_student_guardians_media_consent
    ON student_guardians
    (
        organization_id,
        guardian_id,
        student_id,
        internal_media_consent,
        marketing_media_consent
    );


-- Guardians receive the general permission required to
-- call consent-aware media endpoints. Record-level access
-- is still enforced by the backend.
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
    ON p.code = 'media.read'
WHERE r.name = 'GUARDIAN'
ON CONFLICT DO NOTHING;
