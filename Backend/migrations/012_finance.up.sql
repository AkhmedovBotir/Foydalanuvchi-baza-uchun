-- Moliya: bo‘linish sxemalari va to‘lov taqsimoti

CREATE TABLE IF NOT EXISTS finance_schemes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name          VARCHAR(200) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    worker_pct    NUMERIC(6,2) NOT NULL DEFAULT 0,  -- Ishchi
    ads_pct       NUMERIC(6,2) NOT NULL DEFAULT 0,  -- Reklama
    doctor_pct    NUMERIC(6,2) NOT NULL DEFAULT 0,  -- Shifokor puli (pool)
    owner_pct     NUMERIC(6,2) NOT NULL DEFAULT 0,  -- Biznes egasi (pool)
    referral_pct  NUMERIC(6,2) NOT NULL DEFAULT 0,  -- Referal (pool)
    owner_sales_pct   NUMERIC(6,2) NOT NULL DEFAULT 50, -- egasi pool ichida Savdo/bank
    owner_deposit_pct NUMERIC(6,2) NOT NULL DEFAULT 50, -- egasi pool ichida Omonat
    is_active     BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_schemes_owner_sub_check CHECK (
        owner_sales_pct + owner_deposit_pct BETWEEN 99.99 AND 100.01
        OR (owner_sales_pct = 0 AND owner_deposit_pct = 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_finance_schemes_company
    ON finance_schemes (company_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_schemes_one_active
    ON finance_schemes (company_id)
    WHERE is_active = true;

-- Shifokor pool ichidagi ulushlar (jami ~100%)
CREATE TABLE IF NOT EXISTS finance_scheme_doctors (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id  UUID NOT NULL REFERENCES finance_schemes(id) ON DELETE CASCADE,
    doctor_id  UUID NOT NULL REFERENCES company_doctors(id) ON DELETE CASCADE,
    pct        NUMERIC(6,2) NOT NULL DEFAULT 0,
    UNIQUE (scheme_id, doctor_id)
);

-- Referal pool ichidagi default ulushlar (referalsiz yoki umumiy bo‘linish; referalli bronlarda 100% o‘sha referalga)
CREATE TABLE IF NOT EXISTS finance_scheme_referrals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id   UUID NOT NULL REFERENCES finance_schemes(id) ON DELETE CASCADE,
    referral_id UUID NOT NULL REFERENCES company_referrals(id) ON DELETE CASCADE,
    pct         NUMERIC(6,2) NOT NULL DEFAULT 0,
    UNIQUE (scheme_id, referral_id)
);

-- Kirim yozuvlari (registrator to‘lov qayd etganda)
CREATE TABLE IF NOT EXISTS finance_incomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    scheme_id       UUID NULL REFERENCES finance_schemes(id) ON DELETE SET NULL,
    source          VARCHAR(20) NOT NULL, -- booking | survey
    source_id       UUID NOT NULL,
    amount          NUMERIC(14,2) NOT NULL,
    has_referral    BOOLEAN NOT NULL DEFAULT false,
    referral_id     UUID NULL REFERENCES company_referrals(id) ON DELETE SET NULL,
    doctor_id       UUID NULL REFERENCES company_doctors(id) ON DELETE SET NULL,
    registrator_id  UUID NULL REFERENCES company_registrators(id) ON DELETE SET NULL,
    patient_name    VARCHAR(200) NOT NULL DEFAULT '',
    patient_phone   VARCHAR(30) NOT NULL DEFAULT '',
    note            TEXT NOT NULL DEFAULT '',
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_incomes_company_paid
    ON finance_incomes (company_id, paid_at DESC);

-- Taqsimot qatorlari
CREATE TABLE IF NOT EXISTS finance_allocations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    income_id          UUID NOT NULL REFERENCES finance_incomes(id) ON DELETE CASCADE,
    category           VARCHAR(40) NOT NULL,
    -- worker | ads | doctor | owner_sales | owner_deposit | referral | residual
    beneficiary_type   VARCHAR(40) NOT NULL DEFAULT '',
    -- pool | doctor | referral | bank | deposit | company
    beneficiary_id     UUID NULL,
    beneficiary_name   VARCHAR(255) NOT NULL DEFAULT '',
    amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | paid
    payout_note        TEXT NOT NULL DEFAULT '',
    paid_out_at        TIMESTAMPTZ NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT finance_allocations_status_check CHECK (status IN ('pending', 'paid')),
    CONSTRAINT finance_allocations_category_check CHECK (category IN (
        'worker', 'ads', 'doctor', 'owner_sales', 'owner_deposit', 'referral', 'residual'
    ))
);

CREATE INDEX IF NOT EXISTS idx_finance_allocations_company_status
    ON finance_allocations (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_allocations_income
    ON finance_allocations (income_id);
