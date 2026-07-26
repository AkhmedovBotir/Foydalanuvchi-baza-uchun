CREATE TABLE IF NOT EXISTS settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT         NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES ('survey_link_base_url', 'http://localhost:5174')
ON CONFLICT (key) DO NOTHING;
