-- Referallar va referal orqali qabul bronlari

CREATE TABLE IF NOT EXISTS company_referrals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(30) NOT NULL,
    specialty   VARCHAR(200) NOT NULL DEFAULT '',
    service_id  UUID NULL REFERENCES appointment_services(id) ON DELETE SET NULL,
    card_id     UUID NULL REFERENCES company_cards(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_referrals_company
    ON company_referrals (company_id);

CREATE INDEX IF NOT EXISTS idx_company_referrals_card
    ON company_referrals (card_id)
    WHERE card_id IS NOT NULL;

ALTER TABLE appointment_bookings
    ADD COLUMN IF NOT EXISTS referral_id UUID NULL REFERENCES company_referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_bookings_referral
    ON appointment_bookings (referral_id)
    WHERE referral_id IS NOT NULL;
