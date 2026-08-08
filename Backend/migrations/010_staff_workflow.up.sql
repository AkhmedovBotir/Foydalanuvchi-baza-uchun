-- Survey javoblari va qabul bronlari uchun registrator/doktor workflow maydonlari

ALTER TABLE survey_responses
    ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID NULL REFERENCES company_doctors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS registrator_id UUID NULL REFERENCES company_registrators(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2) NULL,
    ADD COLUMN IF NOT EXISTS payment_note TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS doctor_conclusion TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS doctor_concluded_at TIMESTAMPTZ NULL;

DO $$ BEGIN
    ALTER TABLE survey_responses
        ADD CONSTRAINT survey_responses_workflow_status_check
        CHECK (workflow_status IN (
            'pending', 'assigned', 'paid', 'no_show',
            'concluded', 'cancelled', 'doctor_no_show'
        ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_survey_responses_workflow
    ON survey_responses (workflow_status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_doctor
    ON survey_responses (assigned_doctor_id)
    WHERE assigned_doctor_id IS NOT NULL;

ALTER TABLE appointment_bookings
    ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID NULL REFERENCES company_doctors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS registrator_id UUID NULL REFERENCES company_registrators(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2) NULL,
    ADD COLUMN IF NOT EXISTS payment_note TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;
-- doctor conclusion: mavjud conclusion / concluded_at ishlatiladi

DO $$ BEGIN
    ALTER TABLE appointment_bookings
        ADD CONSTRAINT appointment_bookings_workflow_status_check
        CHECK (workflow_status IN (
            'pending', 'assigned', 'paid', 'no_show',
            'concluded', 'cancelled', 'doctor_no_show'
        ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointment_bookings_workflow
    ON appointment_bookings (workflow_status);
CREATE INDEX IF NOT EXISTS idx_appointment_bookings_doctor
    ON appointment_bookings (assigned_doctor_id)
    WHERE assigned_doctor_id IS NOT NULL;
