CREATE TABLE IF NOT EXISTS card_templates (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(200) NOT NULL,
    image_path         TEXT         NOT NULL,
    image_width        INTEGER      NOT NULL,
    image_height       INTEGER      NOT NULL,
    image_content_type VARCHAR(50)  NOT NULL,
    qr_x               INTEGER      NOT NULL DEFAULT 0,
    qr_y               INTEGER      NOT NULL DEFAULT 0,
    qr_width           INTEGER      NOT NULL DEFAULT 0,
    qr_height          INTEGER      NOT NULL DEFAULT 0,
    text_fields        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_cards (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    template_id        UUID         NULL REFERENCES card_templates(id) ON DELETE SET NULL,
    source             VARCHAR(20)  NOT NULL DEFAULT 'custom'
                       CHECK (source IN ('template', 'custom')),
    name               VARCHAR(200) NOT NULL,
    image_path         TEXT         NOT NULL,
    image_width        INTEGER      NOT NULL,
    image_height       INTEGER      NOT NULL,
    image_content_type VARCHAR(50)  NOT NULL,
    qr_x               INTEGER      NOT NULL DEFAULT 0,
    qr_y               INTEGER      NOT NULL DEFAULT 0,
    qr_width           INTEGER      NOT NULL DEFAULT 0,
    qr_height          INTEGER      NOT NULL DEFAULT 0,
    text_fields        JSONB        NOT NULL DEFAULT '[]'::jsonb,
    orientation        VARCHAR(20)  NOT NULL DEFAULT '',
    cols               INTEGER      NOT NULL DEFAULT 0,
    rows               INTEGER      NOT NULL DEFAULT 0,
    margin_mm          DOUBLE PRECISION NOT NULL DEFAULT 5,
    gap_mm             DOUBLE PRECISION NOT NULL DEFAULT 2,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_cards_company_id ON company_cards (company_id);

ALTER TABLE surveys
    ADD COLUMN IF NOT EXISTS card_id UUID NULL REFERENCES company_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_surveys_card_id ON surveys (card_id);
