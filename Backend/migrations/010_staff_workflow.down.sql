DROP INDEX IF EXISTS idx_appointment_bookings_doctor;
DROP INDEX IF EXISTS idx_appointment_bookings_workflow;
ALTER TABLE appointment_bookings DROP CONSTRAINT IF EXISTS appointment_bookings_workflow_status_check;
ALTER TABLE appointment_bookings
    DROP COLUMN IF EXISTS assigned_doctor_id,
    DROP COLUMN IF EXISTS registrator_id,
    DROP COLUMN IF EXISTS workflow_status,
    DROP COLUMN IF EXISTS payment_amount,
    DROP COLUMN IF EXISTS payment_note,
    DROP COLUMN IF EXISTS paid_at;

DROP INDEX IF EXISTS idx_survey_responses_doctor;
DROP INDEX IF EXISTS idx_survey_responses_workflow;
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_workflow_status_check;
ALTER TABLE survey_responses
    DROP COLUMN IF EXISTS assigned_doctor_id,
    DROP COLUMN IF EXISTS registrator_id,
    DROP COLUMN IF EXISTS workflow_status,
    DROP COLUMN IF EXISTS payment_amount,
    DROP COLUMN IF EXISTS payment_note,
    DROP COLUMN IF EXISTS paid_at,
    DROP COLUMN IF EXISTS doctor_conclusion,
    DROP COLUMN IF EXISTS doctor_concluded_at;
