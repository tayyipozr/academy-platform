CREATE TABLE organizations
(
    id                 UUID PRIMARY KEY,
    name               VARCHAR(200) NOT NULL,
    slug               VARCHAR(100) NOT NULL,
    status             VARCHAR(30) NOT NULL,
    default_locale     VARCHAR(20) NOT NULL DEFAULT 'en-US',
    timezone           VARCHAR(100) NOT NULL DEFAULT 'UTC',
    settings           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    version            BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT uk_organizations_slug UNIQUE (slug),
    CONSTRAINT ck_organizations_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED'))
);

CREATE INDEX idx_organizations_status
    ON organizations (status);
