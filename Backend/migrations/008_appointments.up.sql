CREATE TABLE IF NOT EXISTS appointment_services (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id             UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    slug                   VARCHAR(100) NOT NULL,
    title                  VARCHAR(255) NOT NULL,
    description            TEXT         NOT NULL DEFAULT '',
    status                 VARCHAR(20)  NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'published', 'closed')),
    slot_interval_minutes  INTEGER      NOT NULL DEFAULT 30
                           CHECK (slot_interval_minutes >= 5 AND slot_interval_minutes <= 480),
    schedule               JSONB        NOT NULL DEFAULT '[]'::jsonb,
    max_days_ahead         INTEGER      NOT NULL DEFAULT 30
                           CHECK (max_days_ahead >= 1 AND max_days_ahead <= 365),
    card_id                UUID         NULL REFERENCES company_cards(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at           TIMESTAMPTZ  NULL,
    closed_at              TIMESTAMPTZ  NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_services_slug
    ON appointment_services (slug);
CREATE INDEX IF NOT EXISTS idx_appointment_services_company
    ON appointment_services (company_id);

CREATE TABLE IF NOT EXISTS appointment_bookings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id        UUID         NOT NULL REFERENCES appointment_services(id) ON DELETE CASCADE,
    company_id        UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    booking_date      DATE         NOT NULL,
    slot_start        TIME         NOT NULL,
    slot_end          TIME         NOT NULL,
    respondent_name   VARCHAR(200) NOT NULL,
    respondent_phone  VARCHAR(30)  NOT NULL,
    purpose           TEXT         NOT NULL DEFAULT '',
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    conclusion        TEXT         NOT NULL DEFAULT '',
    concluded_at      TIMESTAMPTZ  NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_bookings_service_date
    ON appointment_bookings (service_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_company
    ON appointment_bookings (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_phone
    ON appointment_bookings (respondent_phone);

-- Bitta slotda faqat bitta faol bron
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_bookings_slot_unique
    ON appointment_bookings (service_id, booking_date, slot_start)
    WHERE status <> 'cancelled';
