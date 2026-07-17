CREATE TABLE users
(
    id                  UUID PRIMARY KEY,
    email               VARCHAR(320) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    status              VARCHAR(30) NOT NULL,
    email_verified_at   TIMESTAMP WITH TIME ZONE,
    last_login_at       TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_users_status
        CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'ARCHIVED'))
);

CREATE UNIQUE INDEX uk_users_normalized_email
    ON users (LOWER(email));

CREATE INDEX idx_users_status
    ON users (status);


CREATE TABLE organization_memberships
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    user_id             UUID NOT NULL,
    status              VARCHAR(30) NOT NULL,
    joined_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_memberships_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_memberships_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT uk_memberships_organization_user
        UNIQUE (organization_id, user_id),

    CONSTRAINT ck_memberships_status
        CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'ARCHIVED'))
);

CREATE INDEX idx_memberships_user
    ON organization_memberships (user_id);

CREATE INDEX idx_memberships_organization_status
    ON organization_memberships (organization_id, status);


CREATE TABLE permissions
(
    id                  UUID PRIMARY KEY,
    code                VARCHAR(150) NOT NULL,
    description         VARCHAR(500) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT uk_permissions_code UNIQUE (code)
);


CREATE TABLE roles
(
    id                  UUID PRIMARY KEY,
    organization_id     UUID NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(500),
    system_role         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    version             BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_roles_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT uk_roles_organization_name
        UNIQUE (organization_id, name)
);

CREATE INDEX idx_roles_organization
    ON roles (organization_id);


CREATE TABLE role_permissions
(
    role_id             UUID NOT NULL,
    permission_id       UUID NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES permissions (id)
        ON DELETE CASCADE
);


CREATE TABLE membership_roles
(
    membership_id       UUID NOT NULL,
    role_id             UUID NOT NULL,

    PRIMARY KEY (membership_id, role_id),

    CONSTRAINT fk_membership_roles_membership
        FOREIGN KEY (membership_id)
        REFERENCES organization_memberships (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_membership_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON DELETE CASCADE
);

INSERT INTO permissions (id, code, description, created_at)
VALUES
    ('00000000-0000-0000-0001-000000000001',
     'organization.read',
     'View organization information',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000002',
     'organization.update',
     'Update organization information',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000003',
     'users.read',
     'View organization users',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000004',
     'users.create',
     'Create organization users',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000005',
     'users.update',
     'Update organization users',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000006',
     'users.deactivate',
     'Deactivate organization users',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000007',
     'roles.read',
     'View roles and permissions',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000008',
     'roles.manage',
     'Manage roles and permissions',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000009',
     'students.read',
     'View students',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000010',
     'students.manage',
     'Create and update students',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000011',
     'staff.read',
     'View staff members',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000012',
     'staff.manage',
     'Create and update staff members',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000013',
     'groups.read',
     'View groups',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000014',
     'groups.manage',
     'Manage groups',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000015',
     'sessions.read',
     'View sessions',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000016',
     'sessions.manage',
     'Manage sessions',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000017',
     'attendance.read',
     'View attendance',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000018',
     'attendance.record',
     'Record attendance',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000019',
     'evaluations.read',
     'View evaluations',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000020',
     'evaluations.manage',
     'Create and publish evaluations',
     CURRENT_TIMESTAMP),

    ('00000000-0000-0000-0001-000000000021',
     'reports.read',
     'View reports',
     CURRENT_TIMESTAMP);
