CREATE TABLE students
(
    id                       UUID PRIMARY KEY,
    organization_id          UUID NOT NULL,
    branch_id                UUID,

    student_number           VARCHAR(50) NOT NULL,
    first_name               VARCHAR(100) NOT NULL,
    last_name                VARCHAR(100) NOT NULL,
    birth_date               DATE,
    gender                   VARCHAR(30),

    status                   VARCHAR(30) NOT NULL,
    enrollment_date          DATE,

    medical_notes            TEXT,
    allergies                TEXT,

    emergency_contact_name   VARCHAR(200),
    emergency_contact_phone  VARCHAR(50),

    notes                    TEXT,

    created_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    version                  BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT fk_students_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_students_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches (id),

    CONSTRAINT uk_students_organization_number
        UNIQUE (organization_id, student_number),

    CONSTRAINT uk_students_id_organization
        UNIQUE (id, organization_id),

    CONSTRAINT ck_students_gender
        CHECK (
            gender IS NULL
            OR gender IN (
                'FEMALE',
                'MALE',
                'NON_BINARY',
                'UNSPECIFIED'
            )
        ),

    CONSTRAINT ck_students_status
        CHECK (
            status IN (
                'ACTIVE',
                'INACTIVE',
                'GRADUATED',
                'ARCHIVED'
            )
        )
);

CREATE INDEX idx_students_organization_status
    ON students (organization_id, status);

CREATE INDEX idx_students_organization_branch
    ON students (organization_id, branch_id);

CREATE INDEX idx_students_organization_name
    ON students (
        organization_id,
        LOWER(first_name),
        LOWER(last_name)
    );


ALTER TABLE guardians
    ADD CONSTRAINT uk_guardians_id_organization
        UNIQUE (id, organization_id);


CREATE TABLE student_guardians
(
    organization_id           UUID NOT NULL,
    student_id                UUID NOT NULL,
    guardian_id               UUID NOT NULL,

    relationship_type         VARCHAR(30) NOT NULL,

    primary_contact           BOOLEAN NOT NULL DEFAULT FALSE,
    legal_guardian            BOOLEAN NOT NULL DEFAULT FALSE,
    pickup_authorized         BOOLEAN NOT NULL DEFAULT FALSE,
    receives_notifications    BOOLEAN NOT NULL DEFAULT TRUE,

    internal_media_consent    BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_media_consent   BOOLEAN NOT NULL DEFAULT FALSE,
    consent_recorded_at       TIMESTAMP WITH TIME ZONE,

    created_at                TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at                TIMESTAMP WITH TIME ZONE NOT NULL,

    PRIMARY KEY (student_id, guardian_id),

    CONSTRAINT fk_student_guardians_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id),

    CONSTRAINT fk_student_guardians_student
        FOREIGN KEY (student_id, organization_id)
        REFERENCES students (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student_guardians_guardian
        FOREIGN KEY (guardian_id, organization_id)
        REFERENCES guardians (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT ck_student_guardians_relationship
        CHECK (
            relationship_type IN (
                'MOTHER',
                'FATHER',
                'LEGAL_GUARDIAN',
                'RELATIVE',
                'OTHER'
            )
        )
);

CREATE UNIQUE INDEX uk_student_primary_guardian
    ON student_guardians (
        organization_id,
        student_id
    )
    WHERE primary_contact = TRUE;

CREATE INDEX idx_student_guardians_guardian
    ON student_guardians (
        organization_id,
        guardian_id
    );
