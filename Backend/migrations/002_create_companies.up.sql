CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(30)  NOT NULL,
    username    VARCHAR(100) NOT NULL,
    password    TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_username ON companies (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_phone ON companies (phone);
