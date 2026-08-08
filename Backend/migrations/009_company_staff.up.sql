CREATE TABLE IF NOT EXISTS company_registrators (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(30)  NOT NULL,
    username    VARCHAR(100) NOT NULL,
    password    TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_registrators_username
    ON company_registrators (company_id, LOWER(username));
CREATE INDEX IF NOT EXISTS idx_company_registrators_company
    ON company_registrators (company_id);

CREATE TABLE IF NOT EXISTS company_doctors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    specialty   VARCHAR(200) NOT NULL DEFAULT '',
    phone       VARCHAR(30)  NOT NULL,
    username    VARCHAR(100) NOT NULL,
    password    TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_doctors_username
    ON company_doctors (company_id, LOWER(username));
CREATE INDEX IF NOT EXISTS idx_company_doctors_company
    ON company_doctors (company_id);
